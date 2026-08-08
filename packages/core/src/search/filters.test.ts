import { describe, expect, it } from "vitest";
import { buildVideoFilter, buildVideoSort } from "./filters";

const NOW = Date.UTC(2026, 0, 31);

describe("search filters", () => {
  it("always constrains to published", () => {
    expect(buildVideoFilter({}, NOW)).toBe("status = PUBLISHED");
  });

  it("bands duration, leaving the top band open-ended", () => {
    expect(buildVideoFilter({ duration: "short" }, NOW)).toBe(
      "status = PUBLISHED AND durationSec >= 0 AND durationSec < 600",
    );
    expect(buildVideoFilter({ duration: "medium" }, NOW)).toBe(
      "status = PUBLISHED AND durationSec >= 600 AND durationSec < 1800",
    );
    // No upper bound on "long" — an open range beats a magic ceiling.
    expect(buildVideoFilter({ duration: "long" }, NOW)).toBe(
      "status = PUBLISHED AND durationSec >= 1800",
    );
    expect(buildVideoFilter({ duration: "any" }, NOW)).toBe("status = PUBLISHED");
  });

  it("turns a date range into an absolute publishedAt floor", () => {
    const week = buildVideoFilter({ date: "week" }, NOW);
    expect(week).toBe(`status = PUBLISHED AND publishedAt >= ${NOW - 7 * 86_400_000}`);
    expect(buildVideoFilter({ date: "any" }, NOW)).toBe("status = PUBLISHED");
  });

  it("escapes a quote in the topic slug so the expression cannot be broken", () => {
    const f = buildVideoFilter({ topicSlug: 'evil" OR status = "DRAFT' }, NOW);
    expect(f).toContain('\\"');
    expect(f.startsWith("status = PUBLISHED AND")).toBe(true);
  });

  it("combines every clause with AND", () => {
    const f = buildVideoFilter({ duration: "medium", date: "month", topicSlug: "prameham" }, NOW);
    expect(f.split(" AND ")).toHaveLength(5);
  });

  it("leaves relevance to Meili and maps the explicit sorts", () => {
    expect(buildVideoSort("relevance")).toBeUndefined();
    expect(buildVideoSort()).toBeUndefined();
    expect(buildVideoSort("date")).toEqual(["publishedAt:desc"]);
    expect(buildVideoSort("views")).toEqual(["viewCount:desc"]);
  });
});
