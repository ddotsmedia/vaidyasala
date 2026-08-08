/**
 * Search filter + sort vocabulary (§14). Pure data, so the Meili client, the
 * API route and the UI controls all speak the same names and cannot drift.
 *
 * The duration bands match lib/topic-browse on the web side deliberately —
 * "short" must mean the same thing on a topic hub and in search results.
 */

export const SEARCH_SORTS = ["relevance", "date", "views"] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export const SEARCH_DURATIONS = ["any", "short", "medium", "long"] as const;
export type SearchDuration = (typeof SEARCH_DURATIONS)[number];

export const SEARCH_DATE_RANGES = ["any", "week", "month", "year"] as const;
export type SearchDateRange = (typeof SEARCH_DATE_RANGES)[number];

export interface SearchFilters {
  duration?: SearchDuration;
  date?: SearchDateRange;
  sort?: SearchSort;
  topicSlug?: string;
}

const DURATION_SEC: Record<Exclude<SearchDuration, "any">, [number, number]> = {
  short: [0, 600],
  medium: [600, 1800],
  long: [1800, Number.MAX_SAFE_INTEGER],
};

const RANGE_DAYS: Record<Exclude<SearchDateRange, "any">, number> = {
  week: 7,
  month: 30,
  year: 365,
};

/**
 * Meilisearch filter expression for the videos index. Returns undefined when
 * nothing is constrained beyond status, so the caller can skip the clause.
 *
 * `now` is injected rather than read from the clock so the output is testable.
 */
export function buildVideoFilter(
  filters: SearchFilters = {},
  now: number = Date.now(),
): string {
  const clauses: string[] = ["status = PUBLISHED"];

  if (filters.duration && filters.duration !== "any") {
    const [min, max] = DURATION_SEC[filters.duration];
    clauses.push(`durationSec >= ${min}`);
    // The top band is open-ended; no upper clause keeps the expression honest.
    if (max !== Number.MAX_SAFE_INTEGER) clauses.push(`durationSec < ${max}`);
  }

  if (filters.date && filters.date !== "any") {
    const since = now - RANGE_DAYS[filters.date] * 24 * 60 * 60 * 1000;
    clauses.push(`publishedAt >= ${since}`);
  }

  if (filters.topicSlug) {
    // Quote it: slugs are user-supplied and could otherwise break the expression.
    clauses.push(`topicSlug = "${filters.topicSlug.replace(/"/g, '\\"')}"`);
  }

  return clauses.join(" AND ");
}

/**
 * Meilisearch sort array. Relevance returns undefined — Meili's own ranking is
 * the relevance order, and passing a sort would override it.
 */
export function buildVideoSort(sort: SearchSort = "relevance"): string[] | undefined {
  switch (sort) {
    case "date":
      return ["publishedAt:desc"];
    case "views":
      return ["viewCount:desc"];
    default:
      return undefined;
  }
}

export function isSearchSort(v: unknown): v is SearchSort {
  return SEARCH_SORTS.includes(v as SearchSort);
}

export function isSearchDuration(v: unknown): v is SearchDuration {
  return SEARCH_DURATIONS.includes(v as SearchDuration);
}

export function isSearchDateRange(v: unknown): v is SearchDateRange {
  return SEARCH_DATE_RANGES.includes(v as SearchDateRange);
}
