"""
PharmaPlan AI REST API routes.
"""

import logging

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import PlainTextResponse

from app.models.database import FACTORY_CATALOGUE
from app.models.schemas import (
    CircularUploadRequest,
    OptimizeScheduleRequest,
    PCTSyncRequest,
    PCTSyncResponse,
    PCTCacheInfo,
    PCTCacheEntry,
)
from app.services.rag_pipeline import RAGPipelineError, run_rag_pipeline
from app.services.optimizer import compute_optimization
from app.utils.mock_data_generator import get_mock_public_circular
from app.services.web_scraper import fetch_live_public_circular
from app.services.pct_scraper import get_pct_scraper, get_cached_circulars, get_cached_tenders, get_cached_bulletin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@router.get("/inventory")
async def get_inventory() -> list[dict]:
    """
    Return the full factory catalogue.

    Each entry describes a molecule / dosage form our production lines can
    manufacture together with margins, capacity, and current allocation.
    """
    return [
        {
            "molecule_name": item.molecule_name,
            "active_dosage": item.active_dosage,
            "delivery_form": item.delivery_form,
            "margin_per_box_usd": item.margin_per_box_usd,
            "max_monthly_box_capacity": item.max_monthly_box_capacity,
            "current_allocated_production": item.current_allocated_production,
            "available_capacity": item.max_monthly_box_capacity - item.current_allocated_production,
        }
        for item in FACTORY_CATALOGUE
    ]


@router.get("/mock-public-circular", response_class=PlainTextResponse)
async def get_mock_public_circular_endpoint() -> str:
    """
    Return a simulated, noisy, unstructured text block that resembles a
    leaked / scraped PDF bulletin from the public drug-distribution grid.

    Use this endpoint during development to feed the Phase-2 RAG pipeline.
    """
    return get_mock_public_circular()


@router.get("/live-public-circular", response_class=PlainTextResponse)
async def get_live_public_circular_endpoint() -> str:
    """
    Fetch real drug shortage data from the OpenFDA public API and return
    it formatted as a bulletin-style text block.

    This endpoint pulls live data from the internet — no mock data involved.
    If the external API is unreachable, a realistic fallback text is returned
    so the demo never breaks.
    """
    text = await fetch_live_public_circular(max_results=20)
    return text


@router.post("/upload-circular", status_code=status.HTTP_200_OK)
async def upload_circular(payload: CircularUploadRequest):
    """
    Ingest a messy public circular text stream and return a structured,
    prioritised list of molecule supply shortages resolved against our
    factory catalogue.

    The request body must contain a ``raw_text`` field with the unstructured
    document content.  The response is a ``ProductionPriorityIndex`` JSON
    payload sorted by urgency.
    """
    text = payload.raw_text

    if not text or not text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="raw_text must be a non-empty string.",
        )

    # Resolve LLM provider: payload override > env var > default mock
    provider = payload.llm_provider.strip() or None

    try:
        priority_index = run_rag_pipeline(text, provider=provider)
    except RAGPipelineError as exc:
        logger.error("RAG pipeline failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"RAG pipeline processing error: {exc}",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error in upload-circular handler.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error: {exc}",
        ) from exc

    return priority_index.model_dump()


@router.post("/optimize-schedule", status_code=status.HTTP_200_OK)
async def optimize_schedule(payload: OptimizeScheduleRequest):
    """
    Execute the AI line-balancing optimisation engine.

    Accepts a list of validated shortage items from the RAG pipeline and
    returns a per-line before/after allocation breakdown with aggregate
    financial impact metrics.

    The mathematical formula applied per shortage target:
        Optimized Boxes = Min(Remaining Factory Capacity, National Deficit Volume)
        Marginal Revenue = Optimized Boxes × Internal Margin Per Box
    """
    if not payload.shortages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="shortages list must not be empty.",
        )

    shortage_dicts = [s.model_dump() for s in payload.shortages]
    # compute_optimization has its own internal try/except that falls back
    # to hardcoded mock data — the UI never sees an error screen.
    result = compute_optimization(shortage_dicts)
    return result


# ── Phase 5 – PCT Live Sync Endpoints ─────────────────────────────────────────────────


@router.post("/sync-live-pct", status_code=status.HTTP_200_OK)
async def sync_live_pct(payload: PCTSyncRequest = PCTSyncRequest()):
    """
    Trigger a live synchronisation with the Pharmacie Centrale de Tunisie
    (PCT) official communication portal.

    The scraper polls both the official circulars and tenders call pages,
    downloads any linked PDFs, extracts their text content, and assembles
    a bulletin-formatted text string compatible with the RAG pipeline.

    If the PCT site is unreachable (geo-blocked, network error, etc.),
    richly curated fallback data is returned so the demo never breaks.

    When ``auto_process=True``, the scraped bulletin is automatically
    submitted to the RAG engine and the shortage results are included
    in the response under ``rag_results``.
    """
    scraper = get_pct_scraper()

    try:
        result = await scraper.sync()
    except Exception as exc:
        logger.exception("PCT sync failed unexpectedly.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PCT sync internal error: {exc}",
        ) from exc

    circulars = result.get("circulars", [])
    tenders = result.get("tenders", [])
    bulletin_text = result.get("combined_bulletin", "")
    status_str = result.get("status", "fallback")
    source = result.get("source", "Unknown")

    # Optionally auto-process through RAG
    rag_results = None
    if payload.auto_process and bulletin_text.strip():
        try:
            provider = payload.llm_provider.strip() or None
            priority_index = run_rag_pipeline(bulletin_text, provider=provider)
            rag_results = priority_index.model_dump().get("items", [])
            logger.info(
                "PCT sync: RAG auto-process returned %d shortage items.",
                len(rag_results) if rag_results else 0,
            )
        except RAGPipelineError as exc:
            logger.warning("PCT sync: RAG auto-process failed (%s) — returning sync data without RAG.", exc)
            rag_results = None
        except Exception as exc:
            logger.warning("PCT sync: RAG auto-process error (%s) — returning sync data without RAG.", exc)
            rag_results = None

    circular_text = result.get("circular_text") or ""
    tender_text = result.get("tender_text") or ""

    response = PCTSyncResponse(
        status=status_str,
        timestamp=result.get("last_sync", ""),
        source=source,
        circulars_count=len(circulars),
        tenders_count=len(tenders),
        circular_text_size=len(circular_text),
        tender_text_size=len(tender_text),
        pct_bulletin_text=bulletin_text,
        rag_results=rag_results,
        message=(
            f"PCT sync {status_str}. "
            f"Found {len(circulars)} circulars and {len(tenders)} tenders. "
            f"Source: {source}."
        ),
    )

    return response.model_dump()


@router.get("/pct-cache", status_code=status.HTTP_200_OK)
async def get_pct_cache():
    """
    Return the current in-memory cache state from the last PCT sync.

    Useful for inspecting what data is available without triggering a
    new network request.
    """
    scraper = get_pct_scraper()
    cache_info = scraper.get_cache_info()

    circulars = get_cached_circulars()
    tenders = get_cached_tenders()
    bulletin_text = get_cached_bulletin()

    cache_entries: list[PCTCacheEntry] = []
    for c in circulars:
        cache_entries.append(
            PCTCacheEntry(
                title=c.get("title", ""),
                url=c.get("url", ""),
                date=c.get("date", ""),
                reference=c.get("reference", ""),
                type=c.get("type", "circular"),
            )
        )
    for t in tenders:
        cache_entries.append(
            PCTCacheEntry(
                title=t.get("title", ""),
                url=t.get("url", ""),
                date=t.get("date", ""),
                reference=t.get("reference", ""),
                type=t.get("type", "tender"),
            )
        )

    return PCTCacheInfo(
        last_sync=cache_info.get("last_sync"),
        circulars=[e for e in cache_entries if e.type == "circular"],
        tenders=[e for e in cache_entries if e.type == "tender"],
        has_bulletin=bulletin_text is not None,
        bulletin_length=len(bulletin_text or ""),
    ).model_dump()
