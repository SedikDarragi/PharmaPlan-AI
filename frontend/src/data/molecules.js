/**
 * Enriched molecule knowledge base.
 *
 * Provides extended fields (therapeutic class, brand aliases, description,
 * typical indications) that aren't stored on the backend but make the
 * detail drawer feel rich and realistic.
 */

const MOLECULE_KNOWLEDGE = {
  Paracetamol: {
    therapeuticClass: "Analgesic / Antipyretic",
    classIcon: "🧊",
    brandAliases: ["Panadol", "Tylenol", "Paracip", "Calpol", "Acetaminophen", "Doliprane"],
    description:
      "First-line analgesic for mild-to-moderate pain and fever. One of the most widely used medicines globally, included on the WHO Essential Medicines List.",
    typicalIndications: ["Headache", "Fever", "Muscle aches", "Common cold", "Toothache"],
    mechanism:
      "Inhibits cyclooxygenase (COX) enzymes in the central nervous system, reducing prostaglandin synthesis.",
    warnings: ["Max daily dose: 4g", "Hepatotoxicity risk at high doses", "Avoid with severe liver impairment"],
    atcCode: "N02BE01",
  },
  Amoxicillin: {
    therapeuticClass: "Antibiotic (Penicillin)",
    classIcon: "💊",
    brandAliases: ["Amoxil", "Moxypen", "Amoxicilline", "Amoxi-Tabs", "Trimox"],
    description:
      "Broad-spectrum penicillin antibiotic used to treat bacterial infections. Often combined with clavulanic acid to overcome resistance.",
    typicalIndications: ["Otitis media", "Streptococcal pharyngitis", "Lower respiratory infections", "UTIs", "Lyme disease"],
    mechanism:
      "Inhibits bacterial cell wall synthesis by binding to penicillin-binding proteins (PBPs), leading to cell lysis.",
    warnings: ["Contraindicated in penicillin allergy", "Monitor for rash", "May reduce oral contraceptive efficacy"],
    atcCode: "J01CA04",
  },
  Metformin: {
    therapeuticClass: "Antidiabetic (Biguanide)",
    classIcon: "🩸",
    brandAliases: ["Glucophage", "Metsal", "Metformine", "Diaformin", "Fortamet"],
    description:
      "First-line oral medication for type 2 diabetes. Improves glycemic control by reducing hepatic glucose production and improving insulin sensitivity.",
    typicalIndications: ["Type 2 diabetes mellitus", "Prediabetes", "PCOS (off-label)", "Gestational diabetes"],
    mechanism:
      "Activates AMP-activated protein kinase (AMPK), reducing hepatic gluconeogenesis and increasing peripheral insulin sensitivity.",
    warnings: ["Risk of lactic acidosis (rare)", "Hold before contrast imaging", "Monitor renal function", "Vitamin B12 deficiency with long-term use"],
    atcCode: "A10BA02",
  },
  Omeprazole: {
    therapeuticClass: "Proton Pump Inhibitor (PPI)",
    classIcon: "🔥",
    brandAliases: ["Losec", "Prilosec", "Omeprazol", "Omez", "Zegerid"],
    description:
      "Potent gastric acid suppressant used for acid-related gastrointestinal disorders. One of the most prescribed medications worldwide.",
    typicalIndications: ["GERD", "Peptic ulcer disease", "Gastric protection with NSAIDs", "Zollinger-Ellison syndrome", "H. pylori eradication (combination)"],
    mechanism:
      "Irreversibly inhibits the H+/K+-ATPase proton pump in gastric parietal cells, blocking acid secretion.",
    warnings: ["Long-term use linked to osteoporosis risk", "May mask gastric malignancy", "Increased risk of C. difficile infection", "Hypomagnesemia with prolonged use"],
    atcCode: "A02BC01",
  },
  Ciprofloxacin: {
    therapeuticClass: "Antibiotic (Fluoroquinolone)",
    classIcon: "💊",
    brandAliases: ["Ciproxin", "Cipro", "Ciflox", "Ciprofloxacine", "Cipro XR"],
    description:
      "Broad-spectrum fluoroquinolone antibiotic effective against both Gram-negative and Gram-positive bacteria. Used for serious infections when other antibiotics fail.",
    typicalIndications: ["Urinary tract infections", "Gastroenteritis", "Respiratory infections", "Anthrax", "Typhoid fever"],
    mechanism:
      "Inhibits bacterial DNA gyrase and topoisomerase IV, preventing DNA replication and transcription.",
    warnings: ["Tendonitis / tendon rupture risk", "Avoid in children and adolescents", "QT prolongation risk", "Peripheral neuropathy", "Avoid with tizanidine"],
    atcCode: "J01MA02",
  },
  Losartan: {
    therapeuticClass: "ARB (Angiotensin Receptor Blocker)",
    classIcon: "❤️",
    brandAliases: ["Cozaar", "Losartane", "Lozap", "Hyzaar", "Lorsatan"],
    description:
      "Angiotensin II receptor antagonist used primarily for hypertension and nephropathy. Well-tolerated with fewer side effects than ACE inhibitors.",
    typicalIndications: ["Hypertension", "Diabetic nephropathy", "Heart failure", "Stroke prevention", "Left ventricular hypertrophy"],
    mechanism:
      "Selectively blocks angiotensin II at the AT1 receptor, causing vasodilation and reduced aldosterone secretion.",
    warnings: ["Avoid in pregnancy", "Monitor renal function and potassium", "Can cause angioedema (rare)", "Hypotension risk in volume-depleted patients"],
    atcCode: "C09CA01",
  },
};

export default MOLECULE_KNOWLEDGE;

/**
 * Fallback for molecules not in the knowledge base.
 */
export function getMoleculeFallback(name) {
  return {
    therapeuticClass: "Unclassified",
    classIcon: "🔬",
    brandAliases: [],
    description: `No detailed information available for "${name}".`,
    typicalIndications: [],
    mechanism: "Unknown",
    warnings: [],
    atcCode: "—",
  };
}
