import type { PrismaClient } from "@vaidyasala/db";
import { SearchClient } from "@vaidyasala/core/search/client";

interface Deps {
  prisma: PrismaClient;
  siteUrl?: string;
  log?: (msg: string) => void;
}

/**
 * seo-pull (§7.6): pull Google Search Console + CrUX per-URL metrics into
 * SeoSnapshot. BLOCKED (no-op) without GSC credentials — the dashboard shows an
 * empty state until they're provisioned.
 */
export function createSeoPullProcessor(deps: Deps) {
  const log = deps.log ?? (() => {});
  return async function runSeoPull(): Promise<{ costUsd: number }> {
    if (!process.env.GSC_CLIENT_EMAIL || !process.env.GSC_PRIVATE_KEY) {
      log("[seo-pull] BLOCKED: no GSC credentials — skipping");
      return { costUsd: 0 };
    }
    // Live GSC/CrUX pull lands with credentials; the SeoSnapshot upsert shape is
    // (path, date) unique so re-runs are idempotent.
    log("[seo-pull] credentials present — pull not yet implemented");
    return { costUsd: 0 };
  };
}

/**
 * link-crawl (§7.6): fetch the sitemap and probe pages for broken links / schema
 * failures → SiteHealthIssue. Best-effort; records nothing when the site is
 * unreachable from the worker (dev).
 */
export function createLinkCrawlProcessor(deps: Deps) {
  const log = deps.log ?? (() => {});
  const base = (deps.siteUrl ?? "http://localhost:3000").replace(/\/$/, "");
  return async function runLinkCrawl(): Promise<{ costUsd: number }> {
    let checked = 0;
    let broken = 0;
    try {
      const res = await fetch(`${base}/sitemap/pages.xml`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        log(`[link-crawl] sitemap unreachable (${res.status}) — skipping`);
        return { costUsd: 0 };
      }
      const xml = await res.text();
      const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!).slice(0, 20);
      for (const url of urls) {
        checked++;
        try {
          const head = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
          if (head.status >= 400) {
            broken++;
            const path = new URL(url).pathname;
            await deps.prisma.siteHealthIssue.create({
              data: { path, kind: "broken-link", detail: { status: head.status } },
            });
          }
        } catch {
          /* transient — skip */
        }
      }
    } catch {
      log("[link-crawl] site unreachable — skipping");
      return { costUsd: 0 };
    }
    log(`[link-crawl] checked ${checked} urls, ${broken} broken`);
    return { costUsd: 0 };
  };
}

/**
 * search-consistency (§7.6): Meilisearch is a disposable projection of Postgres;
 * this nightly sweep flags drift between the published-video count and the videos
 * index, recording a SiteHealthIssue so a reindex can be triggered.
 */
export function createSearchConsistencyProcessor(deps: Deps) {
  const log = deps.log ?? (() => {});
  return async function runSearchConsistency(): Promise<{ costUsd: number }> {
    const search = SearchClient.fromEnv(process.env as Record<string, string | undefined>);
    if (!search) {
      log("[search-consistency] Meili unconfigured — skipping");
      return { costUsd: 0 };
    }
    const dbCount = await deps.prisma.video.count({ where: { status: "PUBLISHED" } });
    let meiliCount = 0;
    try {
      const stats = await search.index("videos").getStats();
      meiliCount = stats.numberOfDocuments;
    } catch {
      log("[search-consistency] could not read Meili stats — skipping");
      return { costUsd: 0 };
    }
    if (dbCount !== meiliCount) {
      log(`[search-consistency] DRIFT: db=${dbCount} meili=${meiliCount}`);
      await deps.prisma.siteHealthIssue.create({
        data: {
          path: "/search",
          kind: "search-drift",
          detail: { dbCount, meiliCount },
        },
      });
    } else {
      log(`[search-consistency] OK: ${dbCount} videos in sync`);
    }
    return { costUsd: 0 };
  };
}
