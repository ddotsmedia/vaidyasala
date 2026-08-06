import type { Metadata } from "next";
import { Badge } from "@vaidyasala/ui";
import { prisma } from "@vaidyasala/db";

export const metadata: Metadata = { title: "SEO" };
export const dynamic = "force-dynamic";

/** /admin/seo (§7.6) — per-URL GSC/CWV trends + site-health issues. */
export default async function SeoPage() {
  const [snapshots, issues] = await Promise.all([
    prisma.seoSnapshot.findMany({ orderBy: { date: "desc" }, take: 50 }),
    prisma.siteHealthIssue.findMany({ where: { resolved: false }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  // Latest snapshot per path.
  const latest = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) if (!latest.has(s.path)) latest.set(s.path, s);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-xl font-semibold">SEO</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-text-dim text-xs font-semibold uppercase tracking-wide">
          Search performance (per URL)
        </h2>
        {latest.size === 0 ? (
          <p className="text-text-dim text-sm">
            No snapshots yet — the nightly GSC/CrUX pull populates this (needs credentials).
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-text-dim text-left text-xs">
              <tr>
                <th className="py-1">URL</th>
                <th className="py-1 text-right">Impressions</th>
                <th className="py-1 text-right">Clicks</th>
                <th className="py-1 text-right">Position</th>
              </tr>
            </thead>
            <tbody>
              {[...latest.values()].map((s) => (
                <tr key={s.id} className="border-border border-t">
                  <td className="max-w-xs truncate py-1">{s.path}</td>
                  <td className="py-1 text-right tabular-nums">{s.impressions}</td>
                  <td className="py-1 text-right tabular-nums">{s.clicks}</td>
                  <td className="py-1 text-right tabular-nums">{s.position.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-text-dim text-xs font-semibold uppercase tracking-wide">
            Site health
          </h2>
          <Badge variant={issues.length ? "cta" : "default"}>{issues.length} open</Badge>
        </div>
        {issues.length === 0 ? (
          <p className="text-text-dim text-sm">No open issues — the nightly crawler found nothing.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {issues.map((i) => (
              <li
                key={i.id}
                className="border-border flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="truncate">{i.path}</span>
                <Badge variant="outline">{i.kind}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
