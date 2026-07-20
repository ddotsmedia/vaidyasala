import type { SeoPingInput } from "@vaidyasala/core/queue";

export interface SeoPingDeps {
  /** Canonical site origin, e.g. https://vaidyasala.live. */
  siteUrl: string;
  /** IndexNow key. Absent ⇒ fixture mode (logs the payload, submits nothing). */
  indexNowKey?: string;
  fetchFn?: typeof fetch;
  log?: (msg: string) => void;
}

/**
 * seo-ping job (§7.2/§9.2): on publish/update, submit the fresh URLs to IndexNow
 * (Bing/Yandex) and re-ping Google's sitemap. Idempotent and best-effort — a
 * ping failure never blocks the publish. Fixture mode when INDEXNOW_KEY absent.
 */
export function createSeoPingProcessor(deps: SeoPingDeps) {
  const fetchFn = deps.fetchFn ?? fetch;
  const log = deps.log ?? (() => {});
  const host = new URL(deps.siteUrl).host;
  // Sitemaps are sharded (§7.2); the video shard is the freshness-critical one.
  const sitemapUrl = `${deps.siteUrl.replace(/\/$/, "")}/sitemap/videos.xml`;

  return async function runSeoPing(data: SeoPingInput): Promise<{ pinged: number; costUsd: number }> {
    const urls = data.urls;

    if (!deps.indexNowKey) {
      // BLOCKED: no INDEXNOW_KEY — record what would have been submitted.
      log(`[seo-ping] fixture (${data.reason}): would submit ${urls.length} url(s) to IndexNow + Google`);
      return { pinged: 0, costUsd: 0 };
    }

    // IndexNow: one request submits the whole URL batch.
    try {
      const res = await fetchFn("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host,
          key: deps.indexNowKey,
          keyLocation: `${deps.siteUrl.replace(/\/$/, "")}/${deps.indexNowKey}.txt`,
          urlList: urls,
        }),
      });
      log(`[seo-ping] IndexNow ${res.status} for ${urls.length} url(s) (${data.reason})`);
    } catch (err) {
      log(`[seo-ping] IndexNow failed (non-fatal): ${(err as Error).message}`);
    }

    // Google sitemap re-ping (best-effort; Google deprecated this in 2023 but it
    // is harmless and kept per §7.2 for engines that still honor it).
    try {
      await fetchFn(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
    } catch {
      /* non-fatal */
    }

    return { pinged: urls.length, costUsd: 0 };
  };
}
