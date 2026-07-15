import { describe, expect, it } from "vitest";
import { slugifyMl } from "./index";

describe("slugifyMl", () => {
  it("lowercases and hyphenates ASCII", () => {
    expect(slugifyMl("Diabetes Symptoms")).toBe("diabetes-symptoms");
  });

  it("strips punctuation and collapses hyphens", () => {
    expect(slugifyMl("  Sugar!! -- kurakkan  ")).toBe("sugar-kurakkan");
  });

  it("preserves Malayalam letters", () => {
    expect(slugifyMl("പ്രമേഹം ചികിത്സ")).toBe("പ്രമേഹം-ചികിത്സ");
  });
});
