"""
RAG (Retrieval-Augmented Generation) pipeline orchestrator.

Coordinates the LLM parsing of unstructured circular text and validates
the resulting structured output against our Pydantic schemas.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.core.llm import LLMClient, get_llm_client
from app.models.schemas import MismatchedTenderOutput, ProductionPriorityIndex

logger = logging.getLogger(__name__)


class RAGPipelineError(Exception):
    """Raised when the RAG pipeline encounters a non-recoverable failure."""


def run_rag_pipeline(
    raw_text: str,
    llm_client: LLMClient | None = None,
    provider: str = "mock",
) -> ProductionPriorityIndex:
    """
    Execute the full parsing and extraction pipeline.

    Parameters
    ----------
    raw_text:
        Unstructured text from a public circular / PDF bulletin.
    llm_client:
        Pre-initialised LLM client.  If ``None``, one is created via
        ``get_llm_client(provider)``.
    provider:
        LLM provider key (only used when *llm_client* is ``None``).

    Returns
    -------
    ProductionPriorityIndex
        A validated Pydantic model containing the prioritised shortage list.

    Raises
    ------
    RAGPipelineError
        If the LLM output cannot be parsed or validated.
    """
    if not raw_text or not raw_text.strip():
        raise RAGPipelineError("raw_text must be a non-empty string.")

    client = llm_client or get_llm_client(provider)

    # Step A — invoke the LLM
    logger.info("RAG pipeline: invoking LLM client (%s) …", type(client).__name__)
    try:
        raw_output: list[dict[str, Any]] = client.parse_circular(raw_text)
    except Exception as exc:
        raise RAGPipelineError(f"LLM invocation failed: {exc}") from exc

    if not isinstance(raw_output, list):
        raise RAGPipelineError(
            f"LLM returned unexpected type: {type(raw_output).__name__}. "
            "Expected a JSON array."
        )

    # Step B — validate each item
    validated: list[MismatchedTenderOutput] = []
    validation_errors: list[str] = []

    for idx, item in enumerate(raw_output):
        try:
            validated.append(MismatchedTenderOutput(**item))
        except Exception as exc:
            msg = f"Item [{idx}] validation error: {exc} — raw: {json.dumps(item)}"
            validation_errors.append(msg)
            logger.warning(msg)

    # Step C — decide what to return
    if not validated and validation_errors:
        # All items failed — this is a critical failure
        raise RAGPipelineError(
            f"All {len(raw_output)} LLM output items failed validation. "
            f"First error: {validation_errors[0]}"
        )

    if validation_errors:
        logger.warning(
            "%d of %d LLM output items failed validation and were skipped.",
            len(validation_errors),
            len(raw_output),
        )

    result = ProductionPriorityIndex(items=validated)

    logger.info(
        "RAG pipeline complete: %d shortage entries extracted.",
        len(result.items),
    )

    return result
