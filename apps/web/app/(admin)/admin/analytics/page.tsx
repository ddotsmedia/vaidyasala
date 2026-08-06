import type { Metadata } from "next";
import { getFunnel, getLeaderboard, getAiCost } from "@/lib/admin/analytics";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

/** /admin/analytics (§7.6) — funnel, video leaderboard, AI cost per video. */
export default async function AnalyticsPage() {
  const [funnel, leaders, cost] = await Promise.all([getFunnel(), getLeaderboard(), getAiCost()]);
  const top = funnel[0]?.count || 1;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold">Analytics</h1>

      {/* Funnel */}
      <section className="flex flex-col gap-3">
        <h2 className="text-text-dim text-xs font-semibold uppercase tracking-wide">Funnel</h2>
        <div className="flex flex-col gap-2">
          {funnel.map((s) => (
            <div key={s.key} className="flex items-center gap-3">
              <span className="w-32 text-sm">{s.label}</span>
              <div className="bg-surface-2 h-6 flex-1 overflow-hidden rounded">
                <div
                  className="bg-brand h-full"
                  style={{ width: `${Math.round((s.count / top) * 100)}%` }}
                />
              </div>
              <span className="w-16 text-right text-sm tabular-nums">{s.count}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Leaderboard */}
        <section className="flex flex-col gap-3">
          <h2 className="text-text-dim text-xs font-semibold uppercase tracking-wide">
            Top videos (plays)
          </h2>
          {leaders.length === 0 ? (
            <p className="text-text-dim text-sm">No play events yet.</p>
          ) : (
            <ol className="flex flex-col gap-1">
              {leaders.map((l, i) => (
                <li
                  key={l.slug}
                  className="border-border flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-ml truncate" lang="ml">
                    {i + 1}. {l.titleMl}
                  </span>
                  <span className="text-text-dim tabular-nums">{l.plays}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* AI cost */}
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-text-dim text-xs font-semibold uppercase tracking-wide">
              AI cost per video
            </h2>
            <span className="text-sm tabular-nums">${cost.total.toFixed(4)} total</span>
          </div>
          {cost.rows.length === 0 ? (
            <p className="text-text-dim text-sm">No AI spend recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {cost.rows.map((r) => (
                <li
                  key={r.slug}
                  className="border-border flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-ml truncate" lang="ml">
                    {r.titleMl}
                  </span>
                  <span className="text-text-dim tabular-nums">${r.costUsd.toFixed(4)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
