/**
 * Ingest ONE real video by id — a proof that the pipeline works on production
 * data without running the whole 503-video catalogue through it.
 *
 *   YOUTUBE_API_KEY=… DATABASE_URL=… MEILI_URL=… MEILI_MASTER_KEY=… \
 *     pnpm --filter @vaidyasala/worker exec tsx scripts/add-single-video.ts <videoId>
 *
 * Deliberately reuses the project's own building blocks — slugifyAscii for the
 * slug, buildVideoSearchDoc for the Meili document — so the row it writes is
 * shaped exactly like one the real ingest job would produce. It is NOT a
 * substitute for that job: no transcript, no AI enrichment, no chapters. Those
 * come from the §8.2 chain when the worker runs.
 *
 * Idempotent: re-running refreshes stats rather than duplicating the video.
 */
import { prisma, VideoStatus } from "@vaidyasala/db";
import { slugifyAscii } from "@vaidyasala/core/content";
import { buildVideoSearchDoc } from "@vaidyasala/core/search";
import { SearchClient } from "@vaidyasala/core/search/client";

const videoId = process.argv[2] ?? "08MHzZ2wWhg";
const apiKey = process.env.YOUTUBE_API_KEY;

interface YtThumb {
  url?: string;
}
interface YtItem {
  id: string;
  snippet: {
    title: string;
    description?: string;
    channelId: string;
    publishedAt: string;
    thumbnails?: Record<string, YtThumb>;
  };
  statistics?: { viewCount?: string; likeCount?: string };
  contentDetails?: { duration?: string };
}

/** ISO-8601 duration (PT5M52S) → seconds. */
function parseDuration(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

async function fetchMetadata(id: string): Promise<YtItem> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("id", id);
  url.searchParams.set("part", "snippet,statistics,contentDetails");
  url.searchParams.set("key", apiKey as string);

  const res = await fetch(url);
  const json = (await res.json()) as { error?: { message: string }; items?: YtItem[] };
  if (json.error) throw new Error(`YouTube API: ${json.error.message}`);
  const item = json.items?.[0];
  if (!item) throw new Error(`video not found: ${id}`);
  return item;
}

async function main(): Promise<void> {
  if (!apiKey) {
    console.error("[single-video] YOUTUBE_API_KEY not set");
    process.exit(1);
  }

  const item = await fetchMetadata(videoId);
  const { snippet, statistics, contentDetails } = item;

  // name → url, matching what youtube/metadata.ts produces and what
  // lib/video.thumbnailUrl() reads.
  const thumbnails: Record<string, string> = {};
  for (const [name, t] of Object.entries(snippet.thumbnails ?? {})) {
    if (t?.url) thumbnails[name] = t.url;
  }

  const durationSec = parseDuration(contentDetails?.duration ?? "");
  const views = Number(statistics?.viewCount ?? 0);
  const likes = Number(statistics?.likeCount ?? 0);
  const ytPublishedAt = new Date(snippet.publishedAt);
  const slug = `${slugifyAscii(snippet.title).slice(0, 80) || "video"}-${videoId}`;

  console.log(`[single-video] ${snippet.title}`);
  console.log(`[single-video] channel=${snippet.channelId} views=${views} likes=${likes} dur=${durationSec}s`);

  const video = await prisma.video.upsert({
    where: { youtubeId: videoId },
    create: {
      youtubeId: videoId,
      slug,
      // PUBLISHED so it is visible without the editorial gate — this row exists
      // to prove display/search/trending, and nothing downstream will publish it.
      status: VideoStatus.PUBLISHED,
      titleMl: snippet.title,
      description: snippet.description ?? "",
      durationSec,
      publishedAt: ytPublishedAt,
      ytPublishedAt,
      thumbnails,
      stats: { views, likes },
    },
    update: {
      titleMl: snippet.title,
      description: snippet.description ?? "",
      durationSec,
      thumbnails,
      stats: { views, likes },
    },
  });
  console.log(`[single-video] db ok — id=${video.id} slug=${video.slug}`);

  const search = SearchClient.fromEnv(process.env as Record<string, string | undefined>);
  if (!search) {
    console.log("[single-video] MEILI_MASTER_KEY absent — skipping index (BLOCKED)");
    return;
  }
  await search.ensureIndexes();
  await search.upsertVideos([
    buildVideoSearchDoc({
      id: video.id,
      slug: video.slug,
      titleMl: video.titleMl,
      titleEn: video.titleEn,
      status: video.status,
      durationSec: video.durationSec,
      publishedAt: video.publishedAt,
      viewCount: views,
    }),
  ]);
  console.log("[single-video] meili ok");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err: unknown) => {
    console.error("[single-video]", err);
    await prisma.$disconnect();
    process.exit(1);
  });
