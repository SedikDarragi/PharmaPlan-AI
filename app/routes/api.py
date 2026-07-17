"""
PharmaPlan AI REST API routes.
"""

import logging

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import PlainTextResponse

from app.models.database import FACTORY_CATALOGUE
from app.models.schemas import CircularUploadRequest
from app.services.rag_pipeline import RAGPipelineError, run_rag_pipeline
from app.utils.mock_data_generator import get_mock_public_circular

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

    try:
        priority_index = run_rag_pipeline(text)
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
