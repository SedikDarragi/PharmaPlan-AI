"""
In-memory mock database representing our factory's manufacturing capabilities.

Swappable for SQLite / Postgres once the real persistence layer is defined.
"""

from app.models.schemas import ActiveMolecule

# ── Factory catalogue ──────────────────────────────────────────────────────────
# Each entry reflects a real-world generic that a local manufacturer might
# produce.  `current_allocated_production` is deliberately less than capacity
# so the RAG engine has headroom to suggest re-allocation in Phase 2.

FACTORY_CATALOGUE: list[ActiveMolecule] = [
    ActiveMolecule(
        molecule_name="Paracetamol",
        active_dosage="500mg",
        delivery_form="Tablets",
        margin_per_box_usd=1.20,
        max_monthly_box_capacity=500_000,
        current_allocated_production=320_000,
    ),
    ActiveMolecule(
        molecule_name="Amoxicillin",
        active_dosage="1g",
        delivery_form="Capsules",
        margin_per_box_usd=2.75,
        max_monthly_box_capacity=200_000,
        current_allocated_production=180_000,
    ),
    ActiveMolecule(
        molecule_name="Metformin",
        active_dosage="850mg",
        delivery_form="Tablets",
        margin_per_box_usd=0.90,
        max_monthly_box_capacity=1_000_000,
        current_allocated_production=720_000,
    ),
    ActiveMolecule(
        molecule_name="Omeprazole",
        active_dosage="20mg",
        delivery_form="Capsules",
        margin_per_box_usd=1.50,
        max_monthly_box_capacity=300_000,
        current_allocated_production=150_000,
    ),
    ActiveMolecule(
        molecule_name="Ciprofloxacin",
        active_dosage="500mg",
        delivery_form="Tablets",
        margin_per_box_usd=3.10,
        max_monthly_box_capacity=180_000,
        current_allocated_production=90_000,
    ),
    # ── Sixth line to meet the "at least 5" requirement generously ─────────
    ActiveMolecule(
        molecule_name="Losartan",
        active_dosage="50mg",
        delivery_form="Tablets",
        margin_per_box_usd=1.05,
        max_monthly_box_capacity=400_000,
        current_allocated_production=210_000,
    ),
]
