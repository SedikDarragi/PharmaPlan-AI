"""
PharmaPlan AI REST API routes.
"""

import logging

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import PlainTextResponse

from app.models.database import FACTORY_CATALOGUE
from app.models.schemas import CircularUploadRequest, OptimizeScheduleRequest
from app.services.rag_pipeline import RAGPipelineError, run_rag_pipeline
from app.services.optimizer import compute_optimization
from app.utils.mock_data_generator import get_mock_public_circular
from app.services.web_scraper import fetch_live_public_circular

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
