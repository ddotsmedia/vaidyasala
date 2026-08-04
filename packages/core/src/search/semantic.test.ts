import { describe, expect, it } from "vitest";
import { isQuestionShaped, rrfMerge, shouldRunSemantic } from "./semantic";

describe("isQuestionShaped", () => {
  it("detects question marks", () => {
    expect(isQuestionShaped("diabetes reversible?")).toBe(true);
  });
  it("detects Malayalam question words", () => {
    expect(isQuestionShaped("പ്രമേഹം എങ്ങനെ നിയന്ത്രിക്കാം")).toBe(true);
  });
  it("detects English question phrases", () => {
    expect(isQuestionShaped("how to lower cholesterol")).toBe(true);
  });
  it("does not treat a bare keyword as a question", () => {
    expect(isQuestionShaped("prameham")).toBe(false);
  });
});

describe("shouldRunSemantic", () => {
  it("fires on weak lexical results", () => {
    expect(shouldRunSemantic("prameham", 1)).toBe(true);
  });
  it("fires on questions even with lexical hits", () => {
    expect(shouldRunSemantic("how to lower sugar", 8)).toBe(true);
  });
  it("skips when lexical is strong and not a question", () => {
    expect(shouldRunSemantic("prameham video", 8)).toBe(false);
  });
});

describe("rrfMerge", () => {
  it("fuses ranked lists, rewarding items ranked high in multiple lists", () => {
    const lexical = [
      { id: "a", rank: 1 },
      { id: "b", rank: 2 },
    ];
    const vector = [
      { id: "b", rank: 1 },
      { id: "c", rank: 2 },
    ];
    const merged = rrfMerge([lexical, vector]);
    // b appears high in both → should win.
    expect(merged[0]!.id).toBe("b");
    expect(merged.map((m) => m.id).sort()).toEqual(["a", "b", "c"]);
  });
});
