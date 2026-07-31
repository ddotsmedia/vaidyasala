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
