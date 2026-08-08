import { MeiliSearch, type Index } from "meilisearch";
import { SEARCH_INDEXES, type SearchIndex } from "./index";
import type { VideoSearchDoc } from "./mapper";
import {
  INDEX_SETTINGS,
  classifyScript,
  type ArticleSearchDoc,
  type FaqSearchDoc,
  type QueryScript,
  type TopicSearchDoc,
} from "./config";
import { buildVideoFilter, buildVideoSort, type SearchFilters } from "./filters";

export interface SearchGroupItem {
  id: string;
  label: string;
  href: string;
  sublabel?: string;
}
export interface SearchGroup {
  heading: string;
  items: SearchGroupItem[];
}
export interface SearchResults {
  script: QueryScript;
  groups: SearchGroup[];
  total: number;
}

const HEADINGS: Record<SearchIndex, string> = {
  videos: "Videos",
  articles: "Articles",
  topics: "Topics",
  faqs: "FAQs",
};

/**
 * Shared Meilisearch client (§14): index config, upserts, full rebuild, synonym
 * sync, and the grouped instant-search query. Server-only (worker index-search,
 * reindex script, /api/v1/search) — never imported into client bundles.
 */
export class SearchClient {
  private readonly client: MeiliSearch;

  constructor(host: string, apiKey: string) {
    this.client = new MeiliSearch({ host, apiKey });
  }

  static fromEnv(env: {
    MEILI_URL?: string;
    MEILI_MASTER_KEY?: string;
  }): SearchClient | null {
    if (!env.MEILI_MASTER_KEY) return null;
    return new SearchClient(env.MEILI_URL ?? "http://localhost:7700", env.MEILI_MASTER_KEY);
  }

  index(name: SearchIndex): Index {
    return this.client.index(name);
  }

  /** Create every index and apply its §14 settings (idempotent). */
  async ensureIndexes(): Promise<void> {
    for (const name of SEARCH_INDEXES) {
      await this.client.createIndex(name, { primaryKey: "id" }).catch(() => {});
      const s = INDEX_SETTINGS[name];
      await this.client.index(name).updateSettings({
        searchableAttributes: s.searchableAttributes,
        filterableAttributes: s.filterableAttributes ?? [],
        sortableAttributes: s.sortableAttributes ?? [],
        typoTolerance: { enabled: true },
      });
    }
  }

  async upsertVideos(docs: VideoSearchDoc[]): Promise<void> {
    if (docs.length) await this.client.index("videos").addDocuments(docs, { primaryKey: "id" });
  }
  async upsertArticles(docs: ArticleSearchDoc[]): Promise<void> {
    if (docs.length) await this.client.index("articles").addDocuments(docs, { primaryKey: "id" });
  }
  async upsertTopics(docs: TopicSearchDoc[]): Promise<void> {
    if (docs.length) await this.client.index("topics").addDocuments(docs, { primaryKey: "id" });
  }
  async upsertFaqs(docs: FaqSearchDoc[]): Promise<void> {
    if (docs.length) await this.client.index("faqs").addDocuments(docs, { primaryKey: "id" });
  }

  async clearAll(): Promise<void> {
    for (const name of SEARCH_INDEXES) await this.client.index(name).deleteAllDocuments();
  }

  /**
   * Sync approved SynonymMapping rows (§2/§14) into every index's synonym config.
   * Bidirectional so "prameham" ↔ "പ്രമേഹം" both expand.
   */
  async syncSynonyms(rows: { variant: string; canonical: string }[]): Promise<void> {
    const syn: Record<string, string[]> = {};
    for (const r of rows) {
      const v = r.variant.toLowerCase();
      const c = r.canonical.toLowerCase();
      (syn[v] ??= []).push(r.canonical);
      (syn[c] ??= []).push(r.variant);
    }
    for (const name of SEARCH_INDEXES) await this.client.index(name).updateSynonyms(syn);
  }

  /**
   * Grouped instant search across all four indexes (§14).
   *
   * `filters` apply to the videos index only — duration and publish date are
   * video properties, and a topic or FAQ has no length. Sorting likewise: the
   * other groups stay in relevance order.
   */
  async search(
    query: string,
    limitPerIndex = 5,
    filters: SearchFilters = {},
  ): Promise<SearchResults> {
    const script = classifyScript(query);
    const q = query.trim();
    if (!q) return { script, groups: [], total: 0 };

    const videoFilter = buildVideoFilter(filters);
    const videoSort = buildVideoSort(filters.sort);

    const res = await this.client.multiSearch({
      queries: SEARCH_INDEXES.map((indexUid) => ({
        indexUid,
        q,
        limit: limitPerIndex,
        filter:
          indexUid === "videos"
            ? videoFilter
            : indexUid === "articles"
              ? "status = PUBLISHED"
              : undefined,
        sort: indexUid === "videos" ? videoSort : undefined,
      })),
    });

    const groups: SearchGroup[] = [];
    let total = 0;
    for (const r of res.results) {
      const name = r.indexUid as SearchIndex;
      const items = r.hits.map((h) => toItem(name, h)).filter((x): x is SearchGroupItem => x !== null);
      if (items.length) {
        groups.push({ heading: HEADINGS[name], items });
        total += items.length;
      }
    }
    return { script, groups, total };
  }
}

function toItem(index: SearchIndex, hit: Record<string, unknown>): SearchGroupItem | null {
  const id = String(hit.id ?? "");
  if (!id) return null;
  switch (index) {
    case "videos":
      return { id, label: String(hit.titleMl ?? ""), href: `/watch/${String(hit.slug)}` };
    case "articles":
      return { id, label: String(hit.titleMl ?? ""), href: `/articles/${String(hit.slug)}` };
    case "topics":
      return {
        id,
        label: String(hit.nameMl ?? ""),
        href: `/topics/${String(hit.slug)}`,
        sublabel: String(hit.nameEn ?? ""),
      };
    case "faqs": {
      const t = hit.timestampSec == null ? "" : `?t=${String(hit.timestampSec)}`;
      return {
        id,
        label: String(hit.questionMl ?? ""),
        href: `/watch/${String(hit.videoSlug)}${t}`,
      };
    }
    default:
      return null;
  }
}
