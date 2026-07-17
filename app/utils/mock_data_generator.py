"""
Utility to synthesise a realistic, noisy public circular / PDF bulletin.

The output mimics a scraper's raw extraction from a national drug-distribution
portal: inconsistent line breaks, miscellaneous header numbers, administrative
prose, and — crucially — embedded "Postes Infructueux" (unsuccessful tender
alerts) that use *variant* names for otherwise familiar molecules so that the
Phase-2 RAG/LLM orchestrator has realistic aliases to resolve.
"""

from __future__ import annotations

import random


# ── Variant-name look-up table ─────────────────────────────────────────────────
# Keys are canonical names (matching our catalogue); values are plausible
# alternative names / brand-generics found in real bulletins.
_VARIANTS: dict[str, list[str]] = {
    "Paracetamol": [
        "Acetaminophen",
        "Panadol",
        "Paracip",
        "Calpol 500",
    ],
    "Amoxicillin": [
        "Amoxil 1000",
        "Amoxicilline",
        "Moxypen",
        "Amoxi-Tabs",
    ],
    "Metformin": [
        "Glucophage 850",
        "Metsal",
        "Metformine",
        "Diaformin",
    ],
    "Omeprazole": [
        "Losec 20",
        "Omeprazol",
        "Prilosec",
        "Omez",
    ],
    "Ciprofloxacin": [
        "Ciproxin 500",
        "Ciprofloxacine",
        "Cipro XR",
        "Ciflox",
    ],
    "Losartan": [
        "Cozaar 50",
        "Losartane",
        "Lozap",
        "Hyzaar",
    ],
}

_SECTION_HEADERS = [
    "REPUBLIQUE DE PHARMALAND\nMINISTERE DE LA SANTE PUBLIQUE\nDIRECTION DE LA PHARMACIE ET DU MEDICAMENT",
    "CIRCULAIRE N° {n:04d}/DPH-{year}/SG/DPM",
    "OBJET : AVIS D'APPEL D'OFFRES POUR L'ACQUISITION DE PRODUITS PHARMACEUTIQUES",
    "REF : Note de service N° {n:04d}/MS/CAB du {day:02d}/{month:02d}/{year}",
    "--- PAGE {page} ---",
    "ANNEXE TECHNIQUE : LISTE DES PRODUITS PHARMACEUTIQUES SOUS TUTELLE",
]

_ADMIN_BLURBS = [
    "Le present avis d'appel d'offres fait suite au plan de passation des marches de l'exercice {year}.",
    "Les soumissionnaires interesses sont invites a retirer le dossier d'appel d'offres a la Direction de la Pharmacie.",
    "La date limite de depot des offres est fixee au {day:02d}/{month:02d}/{year} a 10h00.",
    "Les offres seront ouvertes en seance publique le meme jour a 11h00 dans la salle de reunions de la DPM.",
    "Toute offre incomplete ou parvenue apres le delai sera declaree irrecevable.",
    "Le cautionnement provisoire est fixe a 2% du montant total du lot.",
    "Le delai de livraison est de quatre-vingt-dix (90) jours a compter de la notification du marche.",
    "Les prix sont fermes et non revisibles pendant toute la duree du marche.",
    "La presente consultation est ouverte a tous les fournisseurs agrees par le Ministere.",
    "Les specifications techniques sont conformes a la Pharmacopee Europeenne 10eme edition.",
    "NB : Tout produit dont la date de peremption est inferieure a 18 mois sera systematiquement refuse.",
]

_MISCELLANEOUS_LINES = [
    "DISPONIBILITE : Stock central : {stock:,} unites",
    "PRIX DE REFERENCE : {price:.2f} FCFA TTC par unite",
    "LOT N° {lot} | Date de fabrication : {year}-{month:02d} | Date de peremption : {year+3}-{month:02d}",
    "Certificat d'Analyse N° CA/{year}/{n:04d}",
    "Numero d'enregistrement : {reg}MINSANTE/{year}",
    "Classification : Liste {cls} | Substance psychotrope : {psycho}",
    "Conditionnement primaire : Blister PVC/PE/PVDC | Conditionnement secondaire : Etui en carton",
]


def _generate_bulletin(seed: int = 42) -> str:
    """
    Return a single multi-paragraph text block simulating a leaked / scraped
    PDF public circular.
    """
    rng = random.Random(seed)
    year = rng.randint(2024, 2026)
    paragraphs: list[str] = []

    # ── Header block ──────────────────────────────────────────────────────
    header = _SECTION_HEADERS[0] + "\n"
    header += _SECTION_HEADERS[1].format(n=rng.randint(1, 999), year=year) + "\n"
    header += _SECTION_HEADERS[2] + "\n"
    header += _SECTION_HEADERS[3].format(
        n=rng.randint(1, 999), day=rng.randint(1, 28), month=rng.randint(1, 12), year=year
    )
    paragraphs.append(header)

    # ── Administrative prose (2–4 blurbs) ─────────────────────────────────
    admin = "\n".join(rng.sample(_ADMIN_BLURBS, k=rng.randint(2, 4))).format(
        year=year, day=rng.randint(1, 28), month=rng.randint(1, 12)
    )
    paragraphs.append(admin)

    # ── Catalogue of requested products ───────────────────────────────────
    paragraphs.append(
        "\n".join(
            [
                _SECTION_HEADERS[4].format(page=1),
                "ARTICLE 1er : PRODUITS PHARMACEUTIQUES OBJET DE L'APPEL D'OFFRES\n",
            ]
        )
    )

    canonical_names = list(_VARIANTS.keys())
    for i in range(rng.randint(8, 14)):
        # Pick a random canonical …
        canon = rng.choice(canonical_names)
        # … but *sometimes* use a variant name instead to create aliasing.
        if rng.random() < 0.45:
            display_name = rng.choice(_VARIANTS[canon])
        else:
            display_name = canon

        # Vary dosage writing style
        dosage = rng.choice([f"{rng.choice([250, 500, 850, 1000])} mg", f"{rng.choice([250, 500, 1000])}mg"])
        form = rng.choice(["COMPRIME", "Comp.", "CAPSULE", "Caps.", "SACHET", "INJECTABLE"])
        quantity = rng.randint(5000, 200_000)

        line = (
            f"{i+1:02d}.  {display_name}  {dosage}  {form}  --  Qte : {quantity:,}  "
            f"[Ref. LOT-{rng.randint(100, 999)}-{year}]"
        )
        paragraphs.append(line)

        # 40 % chance of a miscellaneous detail line after this entry
        if rng.random() < 0.40:
            misc = rng.choice(_MISCELLANEOUS_LINES).format(
                stock=rng.randint(1000, 500_000),
                price=rng.uniform(50, 5000),
                lot=rng.randint(1000, 9999),
                year=year,
                month=rng.randint(1, 12),
                n=rng.randint(1, 999),
                reg=chr(rng.randint(65, 90)),
                cls=rng.choice(["I", "II", "III", "IV"]),
                psycho=rng.choice(["OUI", "NON"]),
            )
            paragraphs.append(f"     {misc}")

    # ── "Postes Infructueux" section ──────────────────────────────────────
    paragraphs.append(
        "\n" + _SECTION_HEADERS[4].format(page=2) + "\n"
        "ARTICLE 2 : POSTES INFUCTUEUX (UNSUCCESSFUL TENDER ALERTS)\n"
    )

    for j in range(rng.randint(2, 4)):
        canon = rng.choice(canonical_names)
        # Always use the variant name here to force alias resolution
        alias = rng.choice(_VARIANTS[canon])
        shortfall = rng.randint(10_000, 150_000)
        paragraphs.append(
            f"POSTE N° {rng.randint(100, 999)}:  {alias.upper()}  --  "
            f"QUANTITE NON SERVIE : {shortfall:,} unites  "
            f"| Motif : {rng.choice(['Defaut de fabrication', 'Retard de livraison', 'Non-conformite', 'Absence d\'offre'])}"
        )

    # ── Footer noise ──────────────────────────────────────────────────────
    footer_lines = [
        "",
        "Fait a Pharmalaville, le {day:02d}/{month:02d}/{year}".format(
            day=rng.randint(1, 28), month=rng.randint(1, 12), year=year
        ),
        "LE DIRECTEUR DE LA PHARMACIE ET DU MEDICAMENT",
        "Dr. {first} {last}".format(
            first=rng.choice(["Jean", "Marie", "Paul", "Fatima", "Amadou", "Aminata"]),
            last=rng.choice(["Diop", "Konate", "Traore", "Ndiaye", "Bamba", "Sow"]),
        ),
    ]
    paragraphs.extend(footer_lines)

    return "\n".join(paragraphs)


# Expose a cache so repeated calls are cheap.
_CACHED: str | None = None


def get_mock_public_circular(seed: int = 42) -> str:
    """
    Return a messy, unstructured text block that simulates a leaked
    regulatory bulletin.

    The result is cached for the lifetime of the process so every caller
    sees the same document.
    """
    global _CACHED
    if _CACHED is None:
        _CACHED = _generate_bulletin(seed)
    return _CACHED


def refresh_mock_circular(seed: int | None = None) -> str:
    """Force-regenerate the bulletin, optionally with a new seed."""
    global _CACHED
    _CACHED = _generate_bulletin(seed if seed is not None else random.randint(0, 2**31))
    return _CACHED
