"""
Pydantic schemas used across the PharmaPlan AI domain.
"""

from pydantic import BaseModel, Field


class ActiveMolecule(BaseModel):
    """A molecule / finished dosage form our factory can manufacture."""

    molecule_name: str = Field(description="INN or brand-generic name of the active substance")
    active_dosage: str = Field(description="Strength per unit, e.g. '500mg'")
    delivery_form: str = Field(description="Pharmaceutical form, e.g. 'Tablets', 'Capsules'")
    margin_per_box_usd: float = Field(
        gt=0,
        description="Profit margin per standard box in USD",
    )
    max_monthly_box_capacity: int = Field(
        gt=0,
        description="Maximum boxes we can produce per month",
    )
    current_allocated_production: int = Field(
        ge=0,
        description="Boxes already committed to existing orders this month",
    )


class CircularUploadRequest(BaseModel):
    """Payload accepted by the upload-circular endpoint."""

    raw_text: str = Field(description="Raw unstructured text from a public circular / PDF bulletin")
    llm_provider: str = Field(
        default="",
        description="LLM provider override: 'mock', 'openai', 'google', 'anthropic'. Empty = use env default.",
    )


class MismatchedTenderOutput(BaseModel):
    """A single matched tender item produced by the LLM parsing pipeline."""

    molecule_key: str = Field(description="Canonical molecule name from the factory catalogue (e.g. 'Paracetamol')")
    variant_found_in_text: str = Field(description="The actual string as it appeared in the source document")
    volume_deficit: int = Field(ge=0, description="Total unfulfilled / requested quantity identified in the circular")
    priority_score: int = Field(ge=1, le=10, description="Urgency score assigned by the LLM (1 = low, 10 = critical)")


class ProductionPriorityIndex(BaseModel):
    """Top-level response payload returned from the RAG pipeline."""

    items: list[MismatchedTenderOutput] = Field(description="Prioritised list of molecule supply shortages resolved from the circular")


# ── Phase 4 – Optimization schemas ─────────────────────────────────────────────


class OptimizeScheduleRequest(BaseModel):
    """Payload accepted by the optimize-schedule endpoint."""

    shortages: list[MismatchedTenderOutput] = Field(description="Shortage items from the RAG pipeline to optimise against")


class LineAllocationDetail(BaseModel):
    """Before/after allocation detail for a single production line."""

    molecule_key: str = Field(description="Canonical molecule name")
    before_allocation: int = Field(ge=0, description="Boxes allocated before optimisation")
    after_allocation: int = Field(ge=0, description="Boxes allocated after optimisation")
    capacity_delta: int = Field(description="Change in allocated boxes (negative = scaled back, positive = ramped up)")
    deficit_filled: int = Field(ge=0, description="How much of the national deficit this line now fulfills")
    marginal_revenue: float = Field(ge=0, description="Additional revenue captured by this re-allocation (USD)")


class OptimizationResponse(BaseModel):
    """Full response from the AI line optimisation engine."""

    allocations: list[LineAllocationDetail] = Field(description="Per-line before/after breakdown")
    summary: dict = Field(
        description="Aggregate metrics including "
        "total_revenue_before, total_revenue_after, captured_revenue, "
        "overall_capacity_load_before (%), overall_capacity_load_after (%), "
        "total_shortage_matches"
    )


# ── Phase 5 – PCT Live Sync schemas ──────────────────────────────────────────


class PCTSyncRequest(BaseModel):
    """Payload for triggering a PCT (Pharmacie Centrale de Tunisie) live sync."""

    auto_process: bool = Field(
        default=False,
        description="If true, the scraped bulletin is automatically submitted to the RAG pipeline "
        "and the shortage results are returned alongside the sync metadata.",
    )
    llm_provider: str = Field(
        default="",
        description="LLM provider override for RAG processing (only used when auto_process=True). "
        "Empty = use env default.",
    )


class PCTCacheEntry(BaseModel):
    """A single entry in the PCT cache (circular or tender metadata)."""

    title: str = Field(description="Document title")
    url: str = Field(description="Document URL (may be a PDF link)")
    date: str = Field(default="", description="Publication or issue date")
    reference: str = Field(default="", description="Reference number")
    type: str = Field(description="'circular' or 'tender'")


class PCTSyncResponse(BaseModel):
    """Response payload returned from a PCT live sync operation."""

    status: str = Field(description="Sync status: 'live', 'cached', or 'fallback'")
    timestamp: str = Field(description="ISO-8601 timestamp of the sync")
    source: str = Field(description="Human-readable data source description")
    circulars_count: int = Field(description="Number of circulars found")
    tenders_count: int = Field(description="Number of tenders found")
    circular_text_size: int = Field(description="Size in chars of extracted circular PDF text")
    tender_text_size: int = Field(description="Size in chars of extracted tender PDF text")
    pct_bulletin_text: str = Field(description="Formatted PCT bulletin text ready for the RAG pipeline")
    rag_results: list[dict] | None = Field(
        default=None,
        description="RAG pipeline results if auto_process=True, else null",
    )
    message: str = Field(description="Human-readable status message")


class PCTCacheInfo(BaseModel):
    """Information about the current PCT in-memory cache."""

    last_sync: str | None = Field(description="ISO-8601 timestamp of last sync, or null if never synced")
    circulars: list[PCTCacheEntry] = Field(description="Cached circulars")
    tenders: list[PCTCacheEntry] = Field(description="Cached tenders")
    has_bulletin: bool = Field(description="Whether a bulletin is cached")
    bulletin_length: int = Field(description="Length of the cached bulletin text")
