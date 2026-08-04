import type { Metadata } from "next";
import { Badge } from "@vaidyasala/ui";
import { prisma } from "@vaidyasala/db";
import { SynonymActions } from "@/components/admin/synonym-actions";

export const metadata: Metadata = { title: "Search analytics" };
export const dynamic = "force-dynamic";

/** /admin/search-analytics (§14): top queries, content-gap (zero-result), synonym queue. */
export default async function SearchAnalyticsPage() {
  const [top, zero, suggestions] = await Promise.all([
    prisma.searchQueryLog.groupBy({
      by: ["query"],
      _count: { query: true },
      _max: { results: true },
      orderBy: { _count: { query: "desc" } },
      take: 20,
    }),
    prisma.searchQueryLog.groupBy({
      by: ["query"],
      where: { results: 0 },
      _count: { query: true },
      orderBy: { _count: { query: "desc" } },
      take: 20,
    }),
    prisma.synonymMapping.findMany({
      where: { approved: false },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold">Search analytics</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Top queries */}
        <section className="flex flex-col gap-3">
          <h2 className="text-text-dim text-xs font-semibold uppercase tracking-wide">
            Top queries
          </h2>
          {top.length === 0 ? (
            <p className="text-text-dim text-sm">No queries yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {top.map((t) => (
                <li
                  key={t.query}
                  className="border-border flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-ml" lang="ml">
                    {t.query}
                  </span>
                  <span className="text-text-dim flex items-center gap-2">
                    {(t._max.results ?? 0) === 0 ? <Badge variant="cta">0 results</Badge> : null}
                    <span className="tabular-nums">{t._count.query}×</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Content-gap (zero results) — video idea generator (§7.6) */}
        <section className="flex flex-col gap-3">
          <h2 className="text-text-dim text-xs font-semibold uppercase tracking-wide">
            Content gaps (zero results)
          </h2>
          <p className="text-text-dim text-xs">Queries with no results — your next video ideas.</p>
          {zero.length === 0 ? (
            <p className="text-text-dim text-sm">No content gaps 🎉</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {zero.map((z) => (
                <li
                  key={z.query}
                  className="border-cta/30 bg-cta/5 flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-ml" lang="ml">
                    {z.query}
                  </span>
                  <span className="text-text-dim tabular-nums">{z._count.query}×</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Synonym approval queue (§14) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-text-dim text-xs font-semibold uppercase tracking-wide">
          Synonym approval queue
        </h2>
        {suggestions.length === 0 ? (
          <p className="text-text-dim text-sm">Nothing pending approval.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {suggestions.map((s) => (
              <li
                key={s.id}
                className="border-border flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <code className="bg-surface-2 rounded px-1.5 py-0.5 text-xs">{s.variant}</code>
                  <span className="text-text-dim">→</span>
                  <span className="font-ml" lang="ml">
                    {s.canonical}
                  </span>
                  <Badge variant="outline">{s.source}</Badge>
                </span>
                <SynonymActions id={s.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
