/**
 * Sort/filter/paginate rules for a topic's videos (§1.3).
 *
 * Pure and dependency-free so the exact same logic runs in three places without
 * drifting: the server render, the client browser controls, and the
 * /api/categories/[slug]/videos route.
 */

export const SORTS = ["latest", "trending", "duration"] as const;
export type Sort = (typeof SORTS)[number];

export const DURATIONS = ["all", "short", "medium", "long"] as const;
export type DurationFilter = (typeof DURATIONS)[number];

export const PAGE_SIZE = 12;

/** Short < 10 min, medium 10–30, long > 30. */
export const DURATION_LABEL: Record<DurationFilter, string> = {
  all: "Any length",
  short: "Under 10 min",
  medium: "10–30 min",
  long: "Over 30 min",
};

export const SORT_LABEL: Record<Sort, string> = {
  latest: "Latest",
  trending: "Trending",
  duration: "Longest",
};

export function isSort(v: string | null | undefined): v is Sort {
  return SORTS.includes((v ?? "") as Sort);
}

export function isDuration(v: string | null | undefined): v is DurationFilter {
  return DURATIONS.includes((v ?? "") as DurationFilter);
}

interface Browsable {
  durationSec: number;
  publishedAt: string | null;
  plays: number;
}

export function matchesDuration(video: Browsable, filter: DurationFilter): boolean {
  const min = video.durationSec / 60;
  switch (filter) {
    case "short":
      return min < 10;
    case "medium":
      return min >= 10 && min <= 30;
    case "long":
      return min > 30;
    default:
      return true;
  }
}

/** Stable ordering: ties fall back to duration so paging never reshuffles. */
export function sortVideos<T extends Browsable>(videos: T[], sort: Sort): T[] {
  const out = [...videos];
  switch (sort) {
    case "latest":
      return out.sort(
        (a, b) =>
          (b.publishedAt ? Date.parse(b.publishedAt) : 0) -
            (a.publishedAt ? Date.parse(a.publishedAt) : 0) ||
          b.durationSec - a.durationSec,
      );
    case "trending":
      return out.sort((a, b) => b.plays - a.plays || b.durationSec - a.durationSec);
    case "duration":
      return out.sort((a, b) => b.durationSec - a.durationSec);
    default:
      return out;
  }
}

export interface BrowseResult<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}

export function browse<T extends Browsable>(
  videos: T[],
  opts: { sort?: Sort; duration?: DurationFilter; page?: number; pageSize?: number } = {},
): BrowseResult<T> {
  const sort = opts.sort ?? "latest";
  const duration = opts.duration ?? "all";
  const pageSize = opts.pageSize ?? PAGE_SIZE;

  const filtered = videos.filter((v) => matchesDuration(v, duration));
  const sorted = sortVideos(filtered, sort);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  // Clamp rather than 404: a filter change can drop the page count below the
  // page someone is on, and bouncing them to an error would be hostile.
  const page = Math.min(Math.max(1, opts.page ?? 1), pageCount);

  return {
    items: sorted.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageCount,
    total: sorted.length,
  };
}
