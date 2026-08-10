/**
 * Backfill a channel's catalogue into Video rows (§7B step 2).
 *
 *   YOUTUBE_API_KEY=… YOUTUBE_CHANNEL_ID=… DATABASE_URL=… \
 *   MEILI_URL=… MEILI_MASTER_KEY=… \
 *     pnpm --filter @vaidyasala/worker exec tsx scripts/backfill-channel.ts [flags]
 *
 *   --limit N     stop after N videos            (default: all)
 *   --dry-run     fetch and report, write nothing
 *   --publish     mark imported videos PUBLISHED (default: INGESTING)
 *   --delay MS    pause between write batches    (default: 250)
 *
 * METADATA ONLY. This does not run the §8.2 AI chain, so importing 503 videos
 * costs ~22 YouTube quota units and no AI spend. Transcripts, chapters and
 * enrichment happen when the pipeline processes each video — which is the
 * expensive part and should be turned on deliberately, not as a side effect of
 * a backfill.
 *
 * Resumable and idempotent: existing videos are refreshed in place (slug and
 * status preserved), so re-running after an interruption is safe and cheap.
 *
 * Defaults to INGESTING rather than PUBLISHED: 503 unreviewed videos should not
 * appear on a live site the moment they are imported. Pass --publish only when
 * that is what you actually want.
 */
import { prisma } from "@vaidyasala/db";
import { SearchClient } from "@vaidyasala/core/search/client";
import {
  fetchVideoDetails,
  listUploadIds,
  upsertVideo,
  type UpsertResult,
} from "../src/youtube/import";

interface Flags {
  limit: number;
  dryRun: boolean;
  publish: boolean;
  delayMs: number;
}

function parseFlags(argv: string[]): Flags {
  const get = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  return {
    limit: Number(get("--limit") ?? Number.MAX_SAFE_INTEGER),
    dryRun: argv.includes("--dry-run"),
    publish: argv.includes("--publish"),
    delayMs: Number(get("--delay") ?? 250),
  };
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) {
    console.error("[backfill] YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID are required");
    process.exit(1);
  }

  const flags = parseFlags(process.argv.slice(2));
  console.log(
    `[backfill] channel=${channelId} limit=${flags.limit === Number.MAX_SAFE_INTEGER ? "all" : flags.limit}` +
      ` dryRun=${flags.dryRun} publish=${flags.publish}`,
  );

  const ids = await listUploadIds(channelId, apiKey, flags.limit);
  console.log(`[backfill] ${ids.length} uploads found`);
  if (ids.length === 0) return;

  const search = flags.dryRun
    ? null
    : SearchClient.fromEnv(process.env as Record<string, string | undefined>);
  if (search) await search.ensureIndexes();
  else if (!flags.dryRun) console.log("[backfill] MEILI_MASTER_KEY absent — not indexing");

  let created = 0;
  let updated = 0;
  let failed = 0;

  // 50 is the API's batch ceiling for videos.list, so batches are shaped by the
  // provider rather than chosen.
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const items = await fetchVideoDetails(batch, apiKey);
    const docs: UpsertResult["doc"][] = [];

    for (const item of items) {
      try {
        if (flags.dryRun) {
          console.log(`[backfill] (dry) ${item.snippet.title}`);
          created += 1;
          continue;
        }
        const r = await upsertVideo(prisma, item, { publish: flags.publish });
        docs.push(r.doc);
        if (r.created) created += 1;
        else updated += 1;
      } catch (err) {
        failed += 1;
        // One bad video must not abandon the other 502.
        console.error(`[backfill] FAILED ${item.id}:`, err instanceof Error ? err.message : err);
      }
    }

    if (search && docs.length) await search.upsertVideos(docs);
    const done = Math.min(i + 50, ids.length);
    console.log(`[backfill] ${done}/${ids.length} · created=${created} updated=${updated} failed=${failed}`);
    if (done < ids.length) await sleep(flags.delayMs);
  }

  console.log(
    `[backfill] done — created=${created} updated=${updated} failed=${failed}` +
      (flags.publish ? "" : " · imported as INGESTING (use --publish to make them live)"),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err: unknown) => {
    console.error("[backfill]", err);
    await prisma.$disconnect();
    process.exit(1);
  });
