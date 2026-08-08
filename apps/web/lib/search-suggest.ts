import "server-only";
import { prisma } from "@vaidyasala/db";

export interface TopicSuggestion {
  slug: string;
  nameMl: string;
  nameEn: string;
  videoCount: number;
}

/**
 * Topics to offer when a search returns nothing (§14 "no results? try these").
 *
 * Ranked by catalogue size, because the point is to land the reader somewhere
 * with content rather than to guess what they meant — we already know the query
 * matched nothing, so any semantic guess would be exactly as uninformed.
 */
export async function getFallbackTopics(limit = 6): Promise<TopicSuggestion[]> {
  const topics = await prisma.topic.findMany({
    include: { _count: { select: { videos: true } } },
  });
  return topics
    .filter((t) => t._count.videos > 0)
    .sort((a, b) => b._count.videos - a._count.videos)
    .slice(0, limit)
    .map((t) => ({
      slug: t.slug,
      nameMl: t.nameMl,
      nameEn: t.nameEn,
      videoCount: t._count.videos,
    }));
}

/**
 * Popular past searches for the empty-input type-ahead (§7.6).
 *
 * Only queries that actually returned results are offered — suggesting a query
 * we know leads to a dead end would be worse than suggesting nothing. Grouped
 * so a term searched many times ranks above a one-off.
 */
export async function getPopularSearches(limit = 6, days = 30): Promise<string[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.searchQueryLog.groupBy({
    by: ["query"],
    where: { createdAt: { gt: since }, results: { gt: 0 } },
    _count: { _all: true },
    orderBy: { _count: { query: "desc" } },
    take: limit * 2,
  });
  // Collapse case/spacing variants that would otherwise fill the list with
  // near-duplicates of the same term.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const key = r.query.trim().toLocaleLowerCase().replace(/\s+/g, " ");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r.query.trim());
    if (out.length >= limit) break;
  }
  return out;
}
