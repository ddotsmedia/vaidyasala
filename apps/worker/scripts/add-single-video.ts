/**
 * Ingest ONE real video by id — a spot-check that the pipeline handles
 * production data, without running the whole catalogue through it.
 *
 *   YOUTUBE_API_KEY=… DATABASE_URL=… MEILI_URL=… MEILI_MASTER_KEY=… \
 *     pnpm --filter @vaidyasala/worker exec tsx scripts/add-single-video.ts <videoId> [--publish]
 *
 * Shares its import logic with scripts/backfill-channel.ts (src/youtube/import),
 * so a row written here is identical in shape to one written by the backfill.
 *
 * METADATA ONLY — no transcript, chapters or AI enrichment. Those come from the
 * §8.2 chain when the worker processes the video.
 *
 * Idempotent: re-running refreshes stats rather than duplicating the video.
 */
import { prisma } from "@vaidyasala/db";
import { SearchClient } from "@vaidyasala/core/search/client";
import { fetchVideoDetails, upsertVideo } from "../src/youtube/import";

async function main(): Promise<void> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("[single-video] YOUTUBE_API_KEY not set");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const videoId = args.find((a) => !a.startsWith("--")) ?? "08MHzZ2wWhg";
  const publish = args.includes("--publish");

  const [item] = await fetchVideoDetails([videoId], apiKey);
  if (!item) {
    console.error(`[single-video] video not found: ${videoId}`);
    process.exit(1);
  }

  const r = await upsertVideo(prisma, item, { publish });
  console.log(`[single-video] ${r.title}`);
  console.log(`[single-video] channel=${item.snippet.channelId} views=${r.views} likes=${r.likes}`);
  console.log(`[single-video] db ok — ${r.created ? "created" : "updated"} slug=${r.slug}`);

  const search = SearchClient.fromEnv(process.env as Record<string, string | undefined>);
  if (!search) {
    console.log("[single-video] MEILI_MASTER_KEY absent — skipping index (BLOCKED)");
    return;
  }
  await search.ensureIndexes();
  await search.upsertVideos([r.doc]);
  console.log("[single-video] meili ok");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err: unknown) => {
    console.error("[single-video]", err);
    await prisma.$disconnect();
    process.exit(1);
  });
