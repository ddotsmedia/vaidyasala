import type { PrismaClient } from "@vaidyasala/db";
import type { IngestJobData } from "@vaidyasala/core/queue";

export interface YtPollDeps {
  prisma: PrismaClient;
  apiKey?: string;
  channelId?: string;
  /** Enqueue an ingest job (source: "poll"). */
  enqueueIngest: (data: IngestJobData) => Promise<unknown>;
  /** How many recent uploads to check per poll. */
  limit?: number;
  fetchFn?: typeof fetch;
  log?: (msg: string) => void;
}

interface PlaylistItem {
  contentDetails?: { videoId?: string };
}

/**
 * 15-min polling fallback (§9.1): compare the channel's uploads playlist against
 * known Video rows; enqueue ingest for anything new. BLOCKED (no-op) without
 * YOUTUBE_API_KEY + YOUTUBE_CHANNEL_ID. Never rely on WebSub push alone.
 */
export function createYtPollProcessor(deps: YtPollDeps) {
  const fetchFn = deps.fetchFn ?? fetch;
  const log = deps.log ?? (() => {});
  const limit = deps.limit ?? 15;

  return async function runYtPoll(): Promise<{ enqueued: number; costUsd: number }> {
    if (!deps.apiKey || !deps.channelId) {
      // BLOCKED: YOUTUBE_API_KEY / YOUTUBE_CHANNEL_ID absent — poll skipped.
      log("[yt-poll] BLOCKED: missing YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID");
      return { enqueued: 0, costUsd: 0 };
    }
    // Uploads playlist id: channel UC... → uploads UU...
    const uploadsId = deps.channelId.startsWith("UC")
      ? `UU${deps.channelId.slice(2)}`
      : deps.channelId;
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("playlistId", uploadsId);
    url.searchParams.set("maxResults", String(Math.min(limit, 50)));
    url.searchParams.set("key", deps.apiKey);
    const res = await fetchFn(url.toString());
    if (!res.ok) throw new Error(`YouTube playlistItems ${res.status}`);
    const body = (await res.json()) as { items?: PlaylistItem[] };
    const ids = (body.items ?? [])
      .map((it) => it.contentDetails?.videoId)
      .filter((v): v is string => Boolean(v));

    const known = await deps.prisma.video.findMany({
      where: { youtubeId: { in: ids } },
      select: { youtubeId: true },
    });
    const knownSet = new Set(known.map((v) => v.youtubeId));
    const fresh = ids.filter((id) => !knownSet.has(id));

    for (const youtubeId of fresh) {
      await deps.enqueueIngest({ youtubeId, source: "poll" });
    }
    log(`[yt-poll] ${fresh.length}/${ids.length} new uploads enqueued`);
    return { enqueued: fresh.length, costUsd: 0 };
  };
}
