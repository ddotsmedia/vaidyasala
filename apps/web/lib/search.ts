import "server-only";
import { SearchClient, type SearchResults } from "@vaidyasala/core/search/client";
import { classifyScript, resolveManglish } from "@vaidyasala/core/search";
import { prisma } from "@vaidyasala/db";
import { env } from "./env";

/** Process-wide SearchClient (null when Meili unconfigured). */
const globalForSearch = globalThis as unknown as {
  search?: SearchClient | null;
  synonyms?: { at: number; map: Map<string, string> };
};

export const searchClient: SearchClient | null =
  globalForSearch.search ?? SearchClient.fromEnv(env);

if (process.env.NODE_ENV !== "production") globalForSearch.search = searchClient;

const SYN_TTL_MS = 300_000;

/** Approved SynonymMapping (variant→canonical), cached 5 min (§14). */
async function approvedSynonyms(): Promise<Map<string, string>> {
  const cached = globalForSearch.synonyms;
  if (cached && Date.now() - cached.at < SYN_TTL_MS) return cached.map;
  const rows = await prisma.synonymMapping.findMany({
    where: { approved: true },
    select: { variant: true, canonical: true },
  });
  const map = new Map(rows.map((r) => [r.variant.toLowerCase(), r.canonical]));
  globalForSearch.synonyms = { at: Date.now(), map };
  return map;
}

function mergeResults(a: SearchResults, b: SearchResults): SearchResults {
  const byHeading = new Map(a.groups.map((g) => [g.heading, { ...g, items: [...g.items] }]));
  for (const g of b.groups) {
    const existing = byHeading.get(g.heading);
    if (!existing) {
      byHeading.set(g.heading, { ...g, items: [...g.items] });
      continue;
    }
    const seen = new Set(existing.items.map((i) => i.id));
    for (const it of g.items) if (!seen.has(it.id)) existing.items.push(it);
  }
  const groups = [...byHeading.values()];
  return { script: a.script, groups, total: groups.reduce((n, g) => n + g.items.length, 0) };
}

/**
 * Grouped search with Manglish fallback (§14): runs the lexical query, and when
 * it is romanized-Malayalam and returns few hits, re-runs with the top
 * transliteration/synonym candidate and merges — so "prameham" / "mudi kozhichil"
 * reach the Malayalam content even when Meili's synonyms don't cover the term.
 */
export async function searchWithManglish(q: string, limit = 5): Promise<SearchResults> {
  if (!searchClient) return { script: classifyScript(q), groups: [], total: 0 };
  const primary = await searchClient.search(q, limit);
  if (primary.script !== "manglish" || primary.total >= 3) return primary;

  const { candidates } = resolveManglish(q, await approvedSynonyms());
  let merged = primary;
  for (const cand of candidates.slice(0, 2)) {
    const extra = await searchClient.search(cand, limit);
    merged = mergeResults(merged, extra);
    if (merged.total >= 5) break;
  }
  return { ...merged, script: primary.script };
}
