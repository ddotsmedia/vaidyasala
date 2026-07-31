/**
 * Meilisearch index configuration (§14). Searchable attributes are ORDERED by
 * §14 weight (title > keywords > summary > chapters > transcript). Pure data +
 * mappers + the query script classifier — no meilisearch client here, so this
 * stays safe to import anywhere. The client lives in ./client.
 */
import type { SearchIndex } from "./index";

export interface IndexSettings {
  searchableAttributes: string[];
  filterableAttributes?: string[];
  sortableAttributes?: string[];
  distinctAttribute?: string;
}

export const INDEX_SETTINGS: Record<SearchIndex, IndexSettings> = {
  videos: {
    searchableAttributes: [
      "titleMl",
      "titleEn",
      "keywords",
      "topicNames",
      "summary",
      "chapters",
      "faqs",
      "transcript",
    ],
    filterableAttributes: ["status", "topicSlug"],
    sortableAttributes: ["publishedAt"],
  },
  articles: {
    searchableAttributes: ["titleMl", "titleEn", "summary", "body"],
    filterableAttributes: ["status"],
    sortableAttributes: ["updatedAt"],
  },
  topics: {
    searchableAttributes: ["nameMl", "nameEn", "synonyms", "description"],
    filterableAttributes: ["kind"],
  },
  faqs: {
    searchableAttributes: ["questionMl", "questionEn", "answerMl"],
    filterableAttributes: ["videoSlug"],
  },
};

// ── Non-video mappers (video mapper lives in ./mapper) ──

export interface ArticleSearchDoc {
  id: string;
  slug: string;
  titleMl: string;
  titleEn: string;
  status: string;
  summary: string;
  body: string;
  updatedAt: number | null;
}

export function buildArticleDoc(a: {
  id: string;
  slug: string;
  titleMl: string;
  status: string;
  bodyMl: string;
  bodyEn?: string | null;
  updatedAt?: Date | null;
  video?: { titleEn?: string | null; summaryEn?: string | null } | null;
}): ArticleSearchDoc {
  // Strip MDX/markdown syntax to plain searchable text.
  const plain = a.bodyMl.replace(/[#*`>_[\]()]|\n{2,}/g, " ").slice(0, 8000);
  return {
    id: a.id,
    slug: a.slug,
    titleMl: a.titleMl,
    titleEn: a.video?.titleEn ?? "",
    status: a.status,
    summary: a.video?.summaryEn ?? "",
    body: [plain, a.bodyEn ?? ""].filter(Boolean).join(" "),
    updatedAt: a.updatedAt ? a.updatedAt.getTime() : null,
  };
}

export interface TopicSearchDoc {
  id: string;
  slug: string;
  nameMl: string;
  nameEn: string;
  kind: string;
  synonyms: string[];
  description: string;
}

export function buildTopicDoc(t: {
  id: string;
  slug: string;
  nameMl: string;
  nameEn: string;
  kind: string;
  synonyms: unknown;
  descriptionMl?: string | null;
}): TopicSearchDoc {
  const syn = Array.isArray(t.synonyms) ? (t.synonyms as unknown[]).map(String) : [];
  return {
    id: t.id,
    slug: t.slug,
    nameMl: t.nameMl,
    nameEn: t.nameEn,
    kind: t.kind,
    synonyms: syn,
    description: t.descriptionMl ?? "",
  };
}

export interface FaqSearchDoc {
  id: string;
  videoSlug: string;
  videoId: string;
  questionMl: string;
  questionEn: string;
  answerMl: string;
  timestampSec: number | null;
}

export function buildFaqDoc(f: {
  id: string;
  videoId: string;
  videoSlug: string;
  questionMl: string;
  questionEn?: string | null;
  answerMl: string;
  timestampSec?: number | null;
}): FaqSearchDoc {
  return {
    id: f.id,
    videoSlug: f.videoSlug,
    videoId: f.videoId,
    questionMl: f.questionMl,
    questionEn: f.questionEn ?? "",
    answerMl: f.answerMl,
    timestampSec: f.timestampSec ?? null,
  };
}

// ── Query script classifier (§14) ──

export type QueryScript = "malayalam" | "latin" | "manglish";

const MALAYALAM_RE = /[ഀ-ൿ]/;
// Common Manglish clusters that rarely appear in English words — a cheap signal
// that a Latin query is romanized Malayalam rather than English. The full
// transliteration layer lands in Phase 4B.
const MANGLISH_HINTS =
  /(zh|kk|nn|tt|pp|ll|mm|aa|ee|oo|ai|kal$|ngal|ppu|kku|thth|ndan|yude|ude|inte|aan$|aayi)/i;

/** Classify a raw query into Malayalam / Latin(English) / Manglish (§14). */
export function classifyScript(query: string): QueryScript {
  const q = query.trim();
  if (MALAYALAM_RE.test(q)) return "malayalam";
  if (MANGLISH_HINTS.test(q)) return "manglish";
  return "latin";
}
