/**
 * Meilisearch index config + query builder + manglish (§14). Implemented in
 * Phase 4. Placeholder export keeps the module surface stable.
 */
export const SEARCH_INDEXES = ["videos", "articles", "topics", "faqs"] as const;
export type SearchIndex = (typeof SEARCH_INDEXES)[number];

export {
  buildVideoSearchDoc,
  type VideoSearchDoc,
  type VideoSearchSource,
} from "./mapper";
