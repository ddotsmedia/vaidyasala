import { describe, expect, it } from "vitest";
import { clampDescription } from "./metadata";

const MAX = 160;

describe("clampDescription", () => {
  it("leaves a short description untouched", () => {
    expect(clampDescription("Ayurvedic care for digestion.")).toBe(
      "Ayurvedic care for digestion.",
    );
  });

  it("collapses internal whitespace and trims", () => {
    expect(clampDescription("  two   words\n\there ")).toBe("two words here");
  });

  it("never exceeds the limit, ellipsis included", () => {
    const long = "word ".repeat(200);
    const out = clampDescription(long);
    expect(out.length).toBeLessThanOrEqual(MAX);
  });

  it("breaks on a word boundary rather than mid-word", () => {
    const text = `${"a".repeat(150)} digestion treatment`;
    const out = clampDescription(text);
    // The trailing fragment must be a whole word, not a slice of one.
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/diges…$/);
  });

  it("drops trailing punctuation before the ellipsis", () => {
    const text = `${"x".repeat(140)} alpha, beta gamma delta`;
    expect(clampDescription(text)).not.toMatch(/[,;:]…$/);
  });

  // Malayalam compounds can run past the limit with no space to break on.
  // A hard cut is correct there — better a clipped word than an empty snippet.
  it("hard-cuts when there is no space inside the limit", () => {
    const out = clampDescription("ആ".repeat(300));
    expect(out.length).toBeLessThanOrEqual(MAX);
    expect(out.endsWith("…")).toBe(true);
  });

  it("clamps Malayalam text on its spaces when it has them", () => {
    const text = `${"ആരോഗ്യം ".repeat(40)}`;
    const out = clampDescription(text);
    expect(out.length).toBeLessThanOrEqual(MAX);
    expect(out).not.toMatch(/\s…$/);
  });

  it("honours a caller-supplied limit", () => {
    expect(clampDescription("one two three four five", 10).length).toBeLessThanOrEqual(10);
  });

  it("returns an empty string for blank input rather than a bare ellipsis", () => {
    expect(clampDescription("   ")).toBe("");
  });
});
