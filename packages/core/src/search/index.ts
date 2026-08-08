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

// Pure config + non-video mappers + query script classifier (browser-safe).
// The Meilisearch client is server-only — import it from "@vaidyasala/core/search/client".
export {
  INDEX_SETTINGS,
  buildArticleDoc,
  buildTopicDoc,
  buildFaqDoc,
  classifyScript,
  type IndexSettings,
  type ArticleSearchDoc,
  type TopicSearchDoc,
  type FaqSearchDoc,
  type QueryScript,
} from "./config";

export {
  transliterateWord,
  resolveManglish,
  MANGLISH_FIXTURE,
  type ManglishResolution,
} from "./manglish";

export {
  buildVideoFilter,
  buildVideoSort,
  isSearchSort,
  isSearchDuration,
  isSearchDateRange,
  SEARCH_SORTS,
  SEARCH_DURATIONS,
  SEARCH_DATE_RANGES,
  type SearchFilters,
  type SearchSort,
  type SearchDuration,
  type SearchDateRange,
} from "./filters";

export {
  isQuestionShaped,
  shouldRunSemantic,
  rrfMerge,
  ANSWER_MIN_SCORE,
  type RankedRef,
} from "./semantic";
