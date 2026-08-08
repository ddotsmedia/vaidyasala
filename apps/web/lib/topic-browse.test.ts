import { describe, expect, it } from "vitest";
import { browse, matchesDuration, sortVideos, PAGE_SIZE } from "./topic-browse";

const v = (id: string, min: number, published: string | null, plays = 0) => ({
  id,
  durationSec: min * 60,
  publishedAt: published,
  plays,
});

describe("topic-browse", () => {
  it("bands duration at the 10 and 30 minute boundaries", () => {
    expect(matchesDuration(v("a", 9.9, null), "short")).toBe(true);
    expect(matchesDuration(v("a", 10, null), "short")).toBe(false);
    // 10 and 30 are both inclusive in medium, so no video falls between bands.
    expect(matchesDuration(v("a", 10, null), "medium")).toBe(true);
    expect(matchesDuration(v("a", 30, null), "medium")).toBe(true);
    expect(matchesDuration(v("a", 30.1, null), "long")).toBe(true);
    expect(matchesDuration(v("a", 30, null), "long")).toBe(false);
    expect(matchesDuration(v("a", 999, null), "all")).toBe(true);
  });

  it("sorts newest first, treating a missing date as oldest", () => {
    const out = sortVideos(
      [v("old", 5, "2024-01-01"), v("none", 5, null), v("new", 5, "2026-01-01")],
      "latest",
    );
    expect(out.map((x) => x.id)).toEqual(["new", "old", "none"]);
  });

  it("sorts trending by plays and longest by duration", () => {
    const items = [v("a", 5, null, 3), v("b", 50, null, 10), v("c", 20, null, 1)];
    expect(sortVideos(items, "trending").map((x) => x.id)).toEqual(["b", "a", "c"]);
    expect(sortVideos(items, "duration").map((x) => x.id)).toEqual(["b", "c", "a"]);
  });

  it("does not reshuffle across pages when sort keys tie", () => {
    const tied = Array.from({ length: 5 }, (_, i) => v(`v${i}`, 10 + i, "2025-01-01"));
    const first = sortVideos(tied, "latest").map((x) => x.id);
    const second = sortVideos(tied, "latest").map((x) => x.id);
    expect(first).toEqual(second);
  });

  it("paginates and reports the page count", () => {
    const many = Array.from({ length: 25 }, (_, i) => v(`v${i}`, 5, `2025-01-${(i % 28) + 1}`));
    const p1 = browse(many, { page: 1 });
    expect(p1.items).toHaveLength(PAGE_SIZE);
    expect(p1.pageCount).toBe(3);
    expect(p1.total).toBe(25);
    expect(browse(many, { page: 3 }).items).toHaveLength(1);
  });

  it("clamps an out-of-range page instead of returning nothing", () => {
    const few = [v("a", 5, "2025-01-01")];
    const res = browse(few, { page: 99 });
    expect(res.page).toBe(1);
    expect(res.items).toHaveLength(1);
  });

  it("applies the duration filter before paginating", () => {
    const mixed = [
      ...Array.from({ length: 15 }, (_, i) => v(`s${i}`, 5, "2025-01-01")),
      ...Array.from({ length: 4 }, (_, i) => v(`l${i}`, 45, "2025-01-01")),
    ];
    const res = browse(mixed, { duration: "long" });
    expect(res.total).toBe(4);
    expect(res.pageCount).toBe(1);
    expect(res.items.every((x) => x.id.startsWith("l"))).toBe(true);
  });
});
