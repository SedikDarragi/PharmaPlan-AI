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
