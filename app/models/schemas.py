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


class MismatchedTenderOutput(BaseModel):
    """
    A single matched tender item produced by the LLM parsing pipeline.

    Each instance represents a molecule that was referenced in the public
    circular (possibly under a variant clinical/brand name) and has been
    resolved against the internal factory catalogue.
    """

    molecule_key: str = Field(
        description="Canonical molecule name from the factory catalogue (e.g. 'Paracetamol')"
    )
    variant_found_in_text: str = Field(
        description="The actual string as it appeared in the source document"
    )
    volume_deficit: int = Field(
        ge=0,
        description="Total unfulfilled / requested quantity identified in the circular",
    )
    priority_score: int = Field(
        ge=1,
        le=10,
        description="Urgency score assigned by the LLM (1 = low, 10 = critical)",
    )


class ProductionPriorityIndex(BaseModel):
    """Top-level response payload returned from the RAG pipeline."""

    items: list[MismatchedTenderOutput] = Field(
        description="Prioritised list of molecule supply shortages resolved from the circular"
    )
