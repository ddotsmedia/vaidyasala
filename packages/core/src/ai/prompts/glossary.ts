/**
 * Medical-glossary injection point (§8.2). Correct-ML and enrich prompts inject
 * canonical Malayalam ↔ term mappings so ASR errors on medical vocabulary get
 * fixed consistently. Seeded here; production pulls approved SynonymMapping rows.
 */
export interface GlossaryEntry {
  ml: string;
  en: string;
  aliases?: string[];
}

export const SEED_GLOSSARY: GlossaryEntry[] = [
  { ml: "പ്രമേഹം", en: "diabetes", aliases: ["prameham", "sugar", "പഞ്ചസാര"] },
  { ml: "തൈറോയ്ഡ്", en: "thyroid", aliases: ["thairoid"] },
  { ml: "കൊളസ്ട്രോൾ", en: "cholesterol", aliases: ["kolestrol"] },
  { ml: "രക്തസമ്മർദ്ദം", en: "blood pressure", aliases: ["bp", "pressure"] },
  { ml: "മുടികൊഴിച്ചിൽ", en: "hair fall", aliases: ["mudi kozhichil"] },
];

export function renderGlossary(entries: GlossaryEntry[] = SEED_GLOSSARY): string {
  if (entries.length === 0) return "(none provided)";
  return entries
    .map((e) => `- ${e.ml} = ${e.en}${e.aliases?.length ? ` (also: ${e.aliases.join(", ")})` : ""}`)
    .join("\n");
}

/** Hallucination rules baked into every generation prompt (§8.2 hard rule). */
export const HALLUCINATION_RULES = `HARD RULES (non-negotiable):
- You are TRANSFORMING the provided transcript, never answering from outside knowledge.
- Do NOT introduce medical facts, drug names, dosages, or claims that are not present in the transcript.
- If the transcript does not support a statement, omit it rather than inventing it.
- Preserve Malayalam medical terminology; use the glossary for canonical spellings.
- Output MUST be valid JSON matching the requested schema — no prose, no code fences.`;
