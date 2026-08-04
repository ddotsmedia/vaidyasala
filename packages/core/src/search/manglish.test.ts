import { describe, expect, it } from "vitest";
import { classifyScript } from "./config";
import {
  MANGLISH_FIXTURE,
  resolveManglish,
  transliterateWord,
} from "./manglish";

const MALAYALAM = /[ഀ-ൿ]/;

// Approved synonym dictionary (seeded from Topic.synonyms, §2/§14).
const SYNONYMS = new Map<string, string>([
  ["prameham", "പ്രമേഹം"],
  ["sugar", "പ്രമേഹം"],
  ["thairoid", "തൈറോയ്ഡ്"],
  ["thyroid", "തൈറോയ്ഡ്"],
  ["kolestrol", "കൊളസ്ട്രോൾ"],
  ["cholesterol", "കൊളസ്ട്രോൾ"],
]);

describe("transliterateWord", () => {
  it("produces Malayalam-script candidates", () => {
    for (const w of ["prameham", "vyayamam", "bhakshanam", "arogyam", "chuma"]) {
      const cands = transliterateWord(w);
      expect(cands.length).toBeGreaterThan(0);
      expect(cands.some((c) => MALAYALAM.test(c))).toBe(true);
    }
  });

  it("maps the zh cluster to ഴ (mudi kozhichil)", () => {
    expect(transliterateWord("kozhi").join("")).toContain("ഴ");
  });

  it("renders trailing -am with an anusvara variant", () => {
    expect(transliterateWord("prameham").some((c) => c.endsWith("ം"))).toBe(true);
  });
});

describe("resolveManglish", () => {
  it("prefers the synonym dictionary for known variants", () => {
    const r = resolveManglish("prameham", SYNONYMS);
    expect(r.usedSynonym).toBe(true);
    expect(r.candidates).toContain("പ്രമേഹം");
  });

  it("resolves multi-word queries token by token (sugar kurakkan)", () => {
    const r = resolveManglish("sugar kurakkan", SYNONYMS);
    expect(r.candidates).toContain("പ്രമേഹം"); // sugar → synonym
    expect(r.candidates.some((c) => MALAYALAM.test(c))).toBe(true); // kurakkan → transliterated
  });

  it("falls back to transliteration for unseen terms", () => {
    const r = resolveManglish("kozhichil", SYNONYMS);
    expect(r.usedSynonym).toBe(false);
    expect(r.candidates.some((c) => c.includes("ഴ"))).toBe(true);
  });
});

describe("30-query manglish fixture (§14)", () => {
  it("every query yields at least one Malayalam candidate", () => {
    for (const q of MANGLISH_FIXTURE) {
      const r = resolveManglish(q, SYNONYMS);
      expect(r.candidates.length, `query: ${q}`).toBeGreaterThan(0);
      expect(r.candidates.some((c) => MALAYALAM.test(c)), `query: ${q}`).toBe(true);
    }
  });

  it("classifies script for each query (malayalam | latin | manglish)", () => {
    for (const q of MANGLISH_FIXTURE) {
      expect(["malayalam", "latin", "manglish"]).toContain(classifyScript(q));
    }
    // Mixed-script queries are detected as Malayalam (any ML char wins).
    expect(classifyScript("thala വേദന")).toBe("malayalam");
    // Pure romanized health terms with Manglish clusters.
    expect(classifyScript("mudi kozhichil")).toBe("manglish");
  });
});
