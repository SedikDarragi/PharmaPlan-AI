"""
LLM client abstraction layer.

Provides a pluggable interface so the RAG pipeline can swap the underlying
model provider (OpenAI, Anthropic, or a local mock) without changing its
calling code.
"""

from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from typing import Any

from app.models.database import FACTORY_CATALOGUE

# ---------------------------------------------------------------------------
# Variant name registry — simulates the LLM's embedded pharmaceutical
# knowledge.  Each canonical name maps to one or more aliases that might
# appear in real-world regulatory bulletins.
# ---------------------------------------------------------------------------
_VARIANT_ALIASES: dict[str, list[str]] = {
    "Paracetamol": ["Acetaminophen", "Panadol", "Paracip", "Calpol 500"],
    "Amoxicillin":  ["Amoxil 1000", "Amoxicilline", "Moxypen", "Amoxi-Tabs"],
    "Metformin":    ["Glucophage 850", "Metsal", "Metformine", "Diaformin"],
    "Omeprazole":   ["Losec 20", "Omeprazol", "Prilosec", "Omez"],
    "Ciprofloxacin":["Ciproxin 500", "Ciprofloxacine", "Cipro XR", "Ciflox"],
    "Losartan":     ["Cozaar 50", "Losartane", "Lozap", "Hyzaar"],
}


def _build_alias_canonical_map() -> dict[str, str]:
    """
    Build a flat, case-insensitive lookup: every known string →
    its canonical catalogue key.
    """
    mapping: dict[str, str] = {}
    for canonical, aliases in _VARIANT_ALIASES.items():
        mapping[canonical.lower()] = canonical
        for a in aliases:
            mapping[a.lower()] = canonical
    return mapping


_ALIAS_TO_CANONICAL = _build_alias_canonical_map()

# Canonical names we care about (from our catalogue).
_CANONICAL_NAMES = {m.molecule_name.lower() for m in FACTORY_CATALOGUE}


def _normalise_name(raw: str) -> str | None:
    """
    Attempt to resolve a raw string found in the document to a canonical
    catalogue key.  Returns ``None`` if no match is found.
    """
    key = raw.strip().rstrip(".").lower()
    # Direct alias / canonical lookup
    if key in _ALIAS_TO_CANONICAL:
        return _ALIAS_TO_CANONICAL[key]

    # Fuzzy: try stripping trailing " 500" / " 1000" / " 850" strength
    # suffixes that sometimes get concatenated to the name.
    key_stripped = re.sub(r"\s+\d+$", "", key)
    if key_stripped in _ALIAS_TO_CANONICAL:
        return _ALIAS_TO_CANONICAL[key_stripped]

    # Fuzzy: check if any canonical name is a substring of the raw text
    # (handles cases like "AMOXIL 1000" being found as "AMOXIL")
    for canon_lower in _CANONICAL_NAMES:
        if canon_lower in key or key in canon_lower:
            return _ALIAS_TO_CANONICAL.get(canon_lower) or canon_lower.title()

    return None


# ---------------------------------------------------------------------------
# Priority scoring heuristics
# ---------------------------------------------------------------------------
def _compute_priority(volume_deficit: int) -> int:
    """
    Map a deficit volume to an integer priority 1–10.

    Thresholds calibrated for realistic monthly production volumes.
    """
    if volume_deficit >= 120_000:
        return 10
    elif volume_deficit >= 80_000:
        return 8
    elif volume_deficit >= 50_000:
        return 6
    elif volume_deficit >= 25_000:
        return 4
    else:
        return 2


# ---------------------------------------------------------------------------
# Regex patterns matching the output format of ``mock_data_generator``
# and real-world regulatory bulletins.
# ---------------------------------------------------------------------------
# Pattern A — standard line-item entries (ARTICLE 1)
_RE_LINE_ITEM = re.compile(
    r"(?m)^\s*\d+\.\s+(.+?)\s{2,}\d+\s*mg\s{2,}\S+\s{2,}--\s+Qte\s*:\s*([\d,]+)"
)

# Pattern B — "Postes Infructueux" (unsuccessful tender alerts)
_RE_POSTE_INFRUCTUEUX = re.compile(
    r"(?m)POSTE\s+N[°]\s*\d+:\s+(.+?)\s{2,}--\s+QUANTITE\s+NON\s+SERVIE\s*:\s*([\d,]+)"
)

# Pattern C — generic "quantite" mention (fallback, case-insensitive)
_ALIAS_PATTERN = "|".join(re.escape(a) for a in _ALIAS_TO_CANONICAL)
_RE_GENERIC_QTE = re.compile(
    rf"(?mi)(?:^|\n).*?(?P<name>{_ALIAS_PATTERN}).*?quantite?\s*:?\s*(?P<qty>[\d,]+)"
) if _ALIAS_PATTERN else None


def _extract_quantities(text: str) -> list[tuple[str, str, int]]:
    """
    Extract all (canonical_key, variant_raw, volume) triples from the text
    using multi-pass regex scanning.
    """
    results: list[tuple[str, str, int]] = []

    def _parse_qty(raw: str) -> int:
        return int(raw.replace(",", ""))

    # Pass 1: line-item entries
    for match in _RE_LINE_ITEM.finditer(text):
        name_raw = match.group(1).strip()
        qty = _parse_qty(match.group(2))
        canon = _normalise_name(name_raw)
        if canon and any(canon == m.molecule_name for m in FACTORY_CATALOGUE):
            results.append((canon, name_raw, qty))

    # Pass 2: postes infructueux
    for match in _RE_POSTE_INFRUCTUEUX.finditer(text):
        name_raw = match.group(1).strip()
        qty = _parse_qty(match.group(2))
        canon = _normalise_name(name_raw)
        if canon and any(canon == m.molecule_name for m in FACTORY_CATALOGUE):
            results.append((canon, name_raw, qty))

    # Pass 3: generic fallback for any variant mention with a quantity
    if _RE_GENERIC_QTE is not None:
        for match in _RE_GENERIC_QTE.finditer(text):
            name_raw = match.group("name").strip()
            qty = _parse_qty(match.group("qty"))
            canon = _normalise_name(name_raw)
            if (
                canon
                and any(canon == m.molecule_name for m in FACTORY_CATALOGUE)
                and not any(r[0] == canon and r[1] == name_raw for r in results)  # deduplicate
            ):
                results.append((canon, name_raw, qty))

    return results


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def _build_system_prompt(catalogue_json: str) -> str:
    """
    Assemble the strict structural persona prompt that will be sent to the
    LLM provider.
    """
    return (
        "ROLE: Expert Pharmaceutical Regulatory Auditor & Supply Chain Optimizer\n"
        "TASK: Parse and extract macro generic molecule supply shortages out of "
        "the provided unstructured text logs.\n\n"
        "CRITICAL INSTRUCTIONS:\n"
        "1. Cross-reference the variant clinical/brand names found in the text "
        "(e.g., 'Acetaminophen', 'Amoxil') against our internal master factory "
        "catalog keys.\n"
        "2. Map matches dynamically, calculating total unfulfilled deficit "
        "volumes and assigning an impact priority score (integer, 1-10) based "
        "on market demand urgency.\n"
        "3. You MUST output your conclusions exclusively as a valid JSON array "
        'matching the structure below. Do not wrap the JSON in markdown code '
        "blocks (```json) or append any preamble/postscript text.\n\n"
        "Internal factory catalogue (for key reference):\n"
        f"{catalogue_json}\n\n"
        "Output schema (JSON array):\n"
        '[\n'
        '  {\n'
        '    "molecule_key": "<canonical catalogue name>",\n'
        '    "variant_found_in_text": "<exact string as found>",\n'
        '    "volume_deficit": <integer>,\n'
        '    "priority_score": <integer 1-10>\n'
        '  }\n'
        ']\n'
        "Output ONLY this JSON array — no markdown, no commentary."
    )


class LLMClient(ABC):
    """Abstract base for any LLM provider integration."""

    @abstractmethod
    def parse_circular(self, raw_text: str) -> list[dict[str, Any]]:
        """
        Send the raw circular text to the LLM with the system persona and
        return the parsed JSON array of tender outputs.
        """


class MockLLMClient(LLMClient):
    """
    A fully self-contained mock that simulates the LLM's parsing behaviour
    using deterministic regex extraction and heuristic priority scoring.

    No external API key is required.  This is ideal for development,
    CI testing, and offline demonstrations.
    """

    def __init__(self) -> None:
        catalogue_list = [
            {
                "molecule_name": m.molecule_name,
                "active_dosage": m.active_dosage,
                "delivery_form": m.delivery_form,
                "max_monthly_box_capacity": m.max_monthly_box_capacity,
            }
            for m in FACTORY_CATALOGUE
        ]
        self._system_prompt = _build_system_prompt(json.dumps(catalogue_list, indent=2))

    @property
    def system_prompt(self) -> str:
        """Expose the persona prompt for inspection / logging."""
        return self._system_prompt

    def parse_circular(self, raw_text: str) -> list[dict[str, Any]]:
        """
        Simulate an LLM parse: extract entries, resolve aliases, aggregate
        volumes, and return the expected JSON array.
        """
        # Step 1 — extract raw triples from the text
        triples = _extract_quantities(raw_text)

        # Step 2 — aggregate volumes per canonical key
        aggregated: dict[str, dict[str, Any]] = {}
        for canon_key, variant_raw, qty in triples:
            if canon_key not in aggregated:
                aggregated[canon_key] = {
                    "molecule_key": canon_key,
                    "variant_found_in_text": variant_raw,
                    "volume_deficit": 0,
                    "priority_score": 0,
                }
            aggregated[canon_key]["volume_deficit"] += qty
            # Keep the single most common variant string
            aggregated[canon_key]["variant_found_in_text"] = variant_raw

        # Step 3 — assign priority scores
        for entry in aggregated.values():
            entry["priority_score"] = _compute_priority(entry["volume_deficit"])

        # Step 4 — sort by priority descending, then volume descending
        result = sorted(
            aggregated.values(),
            key=lambda x: (-x["priority_score"], -x["volume_deficit"]),
        )

        return result


class OpenAILLMClient(LLMClient):
    """
    Real OpenAI integration (requires ``OPENAI_API_KEY`` env var).
    Not yet implemented — placeholder for future use.
    """

    def __init__(self, model: str = "gpt-4o-mini") -> None:
        self._model = model
        self._client: Any = None  # openai.OpenAI would be initialised here
        catalogue_list = [
            {
                "molecule_name": m.molecule_name,
                "active_dosage": m.active_dosage,
                "delivery_form": m.delivery_form,
            }
            for m in FACTORY_CATALOGUE
        ]
        self._system_prompt = _build_system_prompt(json.dumps(catalogue_list, indent=2))

    def parse_circular(self, raw_text: str) -> list[dict[str, Any]]:
        """
        Execute the actual OpenAI chat completion.
        # TODO: implement real API call.
        """
        raise NotImplementedError("OpenAI client — implement when OPENAI_API_KEY is available.")


class AnthropicLLMClient(LLMClient):
    """
    Real Anthropic integration (requires ``ANTHROPIC_API_KEY`` env var).
    Not yet implemented — placeholder for future use.
    """

    def __init__(self, model: str = "claude-3-5-haiku-latest") -> None:
        self._model = model
        self._client: Any = None
        catalogue_list = [
            {
                "molecule_name": m.molecule_name,
                "active_dosage": m.active_dosage,
                "delivery_form": m.delivery_form,
            }
            for m in FACTORY_CATALOGUE
        ]
        self._system_prompt = _build_system_prompt(json.dumps(catalogue_list, indent=2))

    def parse_circular(self, raw_text: str) -> list[dict[str, Any]]:
        """
        Execute the actual Anthropic messages API call.
        # TODO: implement real API call.
        """
        raise NotImplementedError("Anthropic client — implement when ANTHROPIC_API_KEY is available.")


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

def get_llm_client(provider: str = "mock") -> LLMClient:
    """
    Return the appropriate LLM client based on the *provider* string.

    Supported providers: ``"mock"`` (default), ``"openai"``, ``"anthropic"``.
    """
    provider_map: dict[str, type[LLMClient]] = {
        "mock": MockLLMClient,
        "openai": OpenAILLMClient,
        "anthropic": AnthropicLLMClient,
    }
    cls = provider_map.get(provider)
    if cls is None:
        raise ValueError(f"Unknown LLM provider '{provider}'. Choose from: {list(provider_map)}")
    return cls()
