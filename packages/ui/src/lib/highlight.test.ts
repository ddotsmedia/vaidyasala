import { describe, expect, it } from "vitest";
import { splitMatches } from "./highlight";

/** Compact view of the runs: matched pieces wrapped in [], so cases read plainly. */
const render = (text: string, query: string): string =>
  splitMatches(text, query)
    .map((r) => (r.match ? `[${r.text}]` : r.text))
    .join("");

describe("splitMatches", () => {
  it("marks a single match", () => {
    expect(render("thyroid health", "thyroid")).toBe("[thyroid] health");
  });

  it("marks every occurrence", () => {
    expect(render("tea and tea", "tea")).toBe("[tea] and [tea]");
  });

  it("matches case-insensitively without re-casing the output", () => {
    expect(render("Thyroid Health", "thyroid")).toBe("[Thyroid] Health");
  });

  it("marks a match in Malayalam", () => {
    expect(render("തൈറോയ്ഡ് ആരോഗ്യം", "തൈറോയ്ഡ്")).toBe("[തൈറോയ്ഡ്] ആരോഗ്യം");
  });

  it("handles a match at the very start and end", () => {
    expect(render("abc", "abc")).toBe("[abc]");
  });

  // The whole point of the empty guard: indexOf("") returns 0 forever.
  it.each(["", "   "])("returns one unmatched run for a blank query (%p)", (q) => {
    expect(splitMatches("thyroid", q)).toEqual([{ text: "thyroid", match: false }]);
  });

  it("returns one unmatched run when nothing matches", () => {
    expect(splitMatches("thyroid", "diabetes")).toEqual([{ text: "thyroid", match: false }]);
  });

  // A Manglish query is transliterated, so it does not substring-match the
  // Malayalam title. Highlighting nothing is the honest outcome.
  it("does not invent a match for a Manglish query", () => {
    expect(splitMatches("തൈറോയ്ഡ്", "thyroid")).toEqual([
      { text: "തൈറോയ്ഡ്", match: false },
    ]);
  });

  it("trims the query before matching", () => {
    expect(render("thyroid health", "  health  ")).toBe("thyroid [health]");
  });

  it("preserves the original text when concatenated back", () => {
    const text = "ആരോഗ്യം: thyroid and thyroid care";
    expect(
      splitMatches(text, "thyroid")
        .map((r) => r.text)
        .join(""),
    ).toBe(text);
  });

  it("declines rather than drifts when lowercasing changes length", () => {
    // "İ" (U+0130) lowercases to two code units; slicing by needle length
    // against the original would misalign every later run.
    expect(splitMatches("İstanbul", "İ")).toEqual([{ text: "İstanbul", match: false }]);
  });
});
