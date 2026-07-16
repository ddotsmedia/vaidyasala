import type { PrismaClient } from "@vaidyasala/db";

export interface StatsRefreshDeps {
  prisma: PrismaClient;
  apiKey?: string;
  fetchFn?: typeof fetch;
  log?: (msg: string) => void;
}

interface StatsItem {
  id: string;
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
}

/**
 * Hourly video stats refresh (§9.3): YouTube Data API statistics → `Video.stats`.
 * BLOCKED (no-op) without YOUTUBE_API_KEY.
 */
export function createStatsRefreshProcessor(deps: StatsRefreshDeps) {
  const fetchFn = deps.fetchFn ?? fetch;
  const log = deps.log ?? (() => {});

  return async function runStatsRefresh(): Promise<{ updated: number; costUsd: number }> {
    if (!deps.apiKey) {
      // BLOCKED: YOUTUBE_API_KEY absent — stats refresh skipped.
      log("[stats-refresh] BLOCKED: no YOUTUBE_API_KEY");
      return { updated: 0, costUsd: 0 };
    }
    const videos = await deps.prisma.video.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, youtubeId: true },
    });
    let updated = 0;
    for (let i = 0; i < videos.length; i += 50) {
      const batch = videos.slice(i, i + 50);
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "statistics");
      url.searchParams.set("id", batch.map((v) => v.youtubeId).join(","));
      url.searchParams.set("key", deps.apiKey);
      const res = await fetchFn(url.toString());
      if (!res.ok) throw new Error(`YouTube stats ${res.status}`);
      const body = (await res.json()) as { items?: StatsItem[] };
      const byId = new Map((body.items ?? []).map((it) => [it.id, it.statistics]));
      for (const v of batch) {
        const s = byId.get(v.youtubeId);
        if (!s) continue;
        await deps.prisma.video.update({
          where: { id: v.id },
          data: {
            stats: {
              views: Number(s.viewCount ?? 0),
              likes: Number(s.likeCount ?? 0),
              comments: Number(s.commentCount ?? 0),
            },
          },
        });
        updated++;
      }
    }
    log(`[stats-refresh] updated ${updated} videos`);
    return { updated, costUsd: 0 };
  };
}
