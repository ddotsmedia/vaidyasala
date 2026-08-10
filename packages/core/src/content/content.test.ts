import { describe, expect, it } from "vitest";
import { slugifyMl, slugifyAscii } from "./index";

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

describe("slugifyAscii", () => {
  it("keeps ASCII and drops Malayalam entirely", () => {
    // Non-ASCII in a Next dynamic route segment prerenders as a 404, so a route
    // slug must never carry Malayalam. This is the regression that broke
    // /watch/[slug] for every real (Malayalam-titled) video.
    expect(
      slugifyAscii("How to remove Stretch Marks | സ്‌ട്രെച് മാർക്സ് | Dr Ambili TS"),
    ).toBe("how-to-remove-stretch-marks-dr-ambili-ts");
    expect(/^[a-z0-9-]*$/.test(slugifyAscii("പ്രമേഹം lakshanangal"))).toBe(true);
  });

  it("returns empty for an all-Malayalam title so the caller's fallback applies", () => {
    expect(slugifyAscii("പ്രമേഹം ലക്ഷണങ്ങൾ")).toBe("");
  });

  it("folds accents rather than stripping the letter", () => {
    expect(slugifyAscii("Café Ayurvéda")).toBe("cafe-ayurveda");
  });

  it("collapses separators and trims", () => {
    expect(slugifyAscii("  a — b //  c  ")).toBe("a-b-c");
  });
});
