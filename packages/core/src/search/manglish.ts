/**
 * Manglish → Malayalam transliteration (§14). Rule-based Mozhi/ISO-15919-style
 * mapping that generates top-k Malayalam candidates for a romanized query, plus
 * a SynonymMapping-backed resolver. Pure + deterministic (unit-tested against a
 * 30-query health-search fixture). The dictionary (approved SynonymMapping rows)
 * is the high-precision path; transliteration is the fallback for unseen terms.
 */

// Independent vowels (word-initial) and their dependent sign (matra).
const VOWELS: Record<string, { independent: string; sign: string }> = {
  aa: { independent: "ആ", sign: "ാ" },
  a: { independent: "അ", sign: "" }, // inherent vowel
  ii: { independent: "ഈ", sign: "ീ" },
  ee: { independent: "ഈ", sign: "ീ" },
  i: { independent: "ഇ", sign: "ി" },
  uu: { independent: "ഊ", sign: "ൂ" },
  oo: { independent: "ഊ", sign: "ൂ" },
  u: { independent: "ഉ", sign: "ു" },
  ai: { independent: "ഐ", sign: "ൈ" },
  au: { independent: "ഔ", sign: "ൌ" },
  e: { independent: "എ", sign: "െ" },
  o: { independent: "ഒ", sign: "ൊ" },
};

// Consonants, longest-key first at match time. Digraphs before singles.
const CONSONANTS: Record<string, string> = {
  zh: "ഴ",
  ng: "ങ",
  nj: "ഞ",
  kh: "ഖ",
  gh: "ഘ",
  chh: "ഛ",
  ch: "ച",
  jh: "ഝ",
  th: "ത",
  dh: "ദ",
  ph: "ഫ",
  bh: "ഭ",
  sh: "ഷ",
  ss: "ഷ",
  k: "ക",
  g: "ഗ",
  c: "ക",
  j: "ജ",
  t: "ട",
  d: "ഡ",
  n: "ന",
  p: "പ",
  b: "ബ",
  m: "മ",
  y: "യ",
  r: "ര",
  l: "ല",
  v: "വ",
  w: "വ",
  s: "സ",
  h: "ഹ",
  f: "ഫ",
};

const VIRAMA = "്";
const VOWEL_KEYS = Object.keys(VOWELS).sort((a, b) => b.length - a.length);
const CONS_KEYS = Object.keys(CONSONANTS).sort((a, b) => b.length - a.length);

function matchAt(s: string, i: number, keys: string[]): string | null {
  for (const k of keys) if (s.startsWith(k, i)) return k;
  return null;
}

/**
 * Transliterate one romanized token to a best-effort Malayalam string. This is
 * a single candidate; `transliterateWord` wraps it with a couple of common
 * long/short-vowel variants for top-k recall.
 */
function transliterateOnce(word: string): string {
  const w = word.toLowerCase();
  let out = "";
  let i = 0;
  let pendingConsonant = false; // a consonant awaiting a vowel sign or virama

  while (i < w.length) {
    const c = matchAt(w, i, CONS_KEYS);
    if (c) {
      if (pendingConsonant) out += VIRAMA; // consonant cluster
      out += CONSONANTS[c];
      pendingConsonant = true;
      i += c.length;
      continue;
    }
    const v = matchAt(w, i, VOWEL_KEYS);
    if (v) {
      const { independent, sign } = VOWELS[v]!;
      if (pendingConsonant) out += sign; // matra on the preceding consonant
      else out += independent;
      pendingConsonant = false;
      i += v.length;
      continue;
    }
    // Unknown char (space handled by caller) — skip.
    i += 1;
  }
  if (pendingConsonant) out += ""; // trailing consonant keeps inherent 'a'
  return out;
}

/** Top-k Malayalam candidates for a single romanized word. */
export function transliterateWord(word: string): string[] {
  const base = transliterateOnce(word);
  const cands = new Set<string>([base]);
  // Common ambiguity: trailing "am" often renders "ം" (anusvara).
  if (/am$/i.test(word)) cands.add(transliterateOnce(word.replace(/am$/i, "")) + "ം");
  return [...cands].filter(Boolean);
}

export interface ManglishResolution {
  /** Candidate Malayalam strings (synonyms first, then transliteration). */
  candidates: string[];
  /** True if at least one token resolved via the approved synonym dictionary. */
  usedSynonym: boolean;
}

/**
 * Resolve a manglish query to Malayalam candidates (§14): each token is looked
 * up in the approved synonym dictionary first (high precision), falling back to
 * transliteration. `synonyms` maps a lowercased variant → canonical Malayalam.
 */
export function resolveManglish(
  query: string,
  synonyms: Map<string, string> = new Map(),
): ManglishResolution {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const candidates: string[] = [];
  let usedSynonym = false;

  for (const tok of tokens) {
    const canon = synonyms.get(tok);
    if (canon) {
      candidates.push(canon);
      usedSynonym = true;
    } else {
      candidates.push(...transliterateWord(tok));
    }
  }
  // De-dup, preserve order.
  return { candidates: [...new Set(candidates)].filter(Boolean), usedSynonym };
}

/** The 30-query manglish health-search fixture (§14). Real-world queries. */
export const MANGLISH_FIXTURE = [
  "prameham",
  "prameham lakshanam",
  "sugar kurakkan",
  "thairoid",
  "thairoid prashnam",
  "kolestrol",
  "kolestrol kurakkan",
  "mudi kozhichil",
  "mudi kozhichil parihaaram",
  "raktha sammardham",
  "bp kurakkan",
  "pഞ്ചസാര", // mixed — has Malayalam, classified malayalam
  "vyayamam",
  "bhakshanam",
  "arogyam",
  "arogya jeevitham",
  "thyroid pareeksha",
  "sugar level",
  "cholesterol kammi",
  "mudi valarthan",
  "thala വേദന", // mixed
  "vishappillayma",
  "kannu vedana",
  "pallu vedana",
  "vayaru vedana",
  "jലദോഷം", // mixed
  "chuma",
  "pani",
  "thadi kുറയ്ക്കാൻ", // mixed
  "rakthaസമ്മർദ്ദം", // mixed
] as const;
