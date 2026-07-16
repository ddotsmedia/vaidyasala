import { describe, expect, it } from "vitest";
import { parseIsoDuration, parseChaptersFromDescription } from "./metadata";

describe("parseIsoDuration", () => {
  it("parses H/M/S", () => {
    expect(parseIsoDuration("PT1H2M3S")).toBe(3723);
    expect(parseIsoDuration("PT10M")).toBe(600);
    expect(parseIsoDuration("PT45S")).toBe(45);
    expect(parseIsoDuration("bad")).toBe(0);
  });
});

describe("parseChaptersFromDescription", () => {
  it("extracts a valid 0-based chapter list", () => {
    const desc = "0:00 Intro\n1:30 Diet\n1:02:03 Deep dive";
    const chapters = parseChaptersFromDescription(desc);
    expect(chapters).toEqual([
      { startSec: 0, titleMl: "Intro" },
      { startSec: 90, titleMl: "Diet" },
      { startSec: 3723, titleMl: "Deep dive" },
    ]);
  });

  it("ignores lists that do not start at 0", () => {
    expect(parseChaptersFromDescription("1:30 Diet\n5:00 Exercise")).toEqual([]);
  });

  it("returns [] when there are no timestamp lines", () => {
    expect(parseChaptersFromDescription("just prose\nno times here")).toEqual([]);
  });
});
