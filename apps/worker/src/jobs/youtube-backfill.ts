import { Queue, Worker, type Job } from "bullmq";
import { prisma, VideoStatus } from "@vaidyasala/db";
import {
  BACKFILL_JOB_NAME,
  QUEUE_NAMES,
  backfillJobSchema,
  type BackfillJobData,
} from "@vaidyasala/core/queue";
import { SearchClient } from "@vaidyasala/core/search/client";
import { connection } from "../redis";
import { env } from "../env";
import { fetchVideoDetails, listUploadIds, upsertVideo } from "../youtube/import";

/**
 * Channel backfill as a queued job (§7B step 2).
 *
 * The logic lives in ../youtube/import — the same module the CLI script uses —
 * so a video imported here is byte-identical to one imported from the shell,
 * and the ASCII-slug and promotion rules are the unit-tested ones rather than a
 * second copy that can drift.
 *
 * METADATA ONLY: this never triggers the §8.2 AI chain. Importing the whole
 * catalogue costs ~22 YouTube quota units and no AI spend.
 */

export interface BackfillProgress {
  processed: number;
  total: number;
  created: number;
  updated: number;
  promoted: number;
  failed: number;
  message: string;
}

async function runImport(
  job: Job<BackfillJobData>,
  data: BackfillJobData,
): Promise<BackfillProgress> {
  const apiKey = env.YOUTUBE_API_KEY;
  const channelId = env.YOUTUBE_CHANNEL_ID;
  if (!apiKey || !channelId) throw new Error("YOUTUBE_API_KEY and YOUTUBE_CHANNEL_ID are required");

  const ids = await listUploadIds(channelId, apiKey, data.limit ?? Number.MAX_SAFE_INTEGER);
  const p: BackfillProgress = {
    processed: 0,
    total: ids.length,
    created: 0,
    updated: 0,
    promoted: 0,
    failed: 0,
    message: `${ids.length} uploads found`,
  };
  await job.updateProgress({ ...p });
  if (ids.length === 0) return p;

  if (data.dryRun) {
    p.processed = ids.length;
    p.message = `dry run — ${ids.length} videos would be imported`;
    await job.updateProgress({ ...p });
    return p;
  }

  const search = SearchClient.fromEnv(process.env as Record<string, string | undefined>);
  if (search) await search.ensureIndexes();

  // 50 is the API's batch ceiling for videos.list.
  for (let i = 0; i < ids.length; i += 50) {
    const items = await fetchVideoDetails(ids.slice(i, i + 50), apiKey);
    const docs = [];

    for (const item of items) {
      try {
        const r = await upsertVideo(prisma, item, { publish: false });
        docs.push(r.doc);
        if (r.created) p.created += 1;
        else p.updated += 1;
      } catch (err) {
        p.failed += 1;
        // One bad video must not abandon the rest of the catalogue.
        await job.log(`FAILED ${item.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
      p.processed += 1;
    }

    if (search && docs.length) await search.upsertVideos(docs);
    p.message = `${p.processed}/${p.total} · created=${p.created} updated=${p.updated} failed=${p.failed}`;
    await job.updateProgress({ ...p });
    await job.log(p.message);
    if (i + 50 < ids.length && data.delayMs > 0) {
      await new Promise((r) => setTimeout(r, data.delayMs));
    }
  }

  p.message = `imported ${p.created} new, refreshed ${p.updated} (INGESTING — publish separately)`;
  await job.updateProgress({ ...p });
  return p;
}

/**
 * Promote imported videos to PUBLISHED.
 *
 * Scoped to INGESTING only, so an editor's HIDDEN decision is never reversed
 * and a PROCESSING video is not exposed mid-pipeline. publishedAt is filled
 * from the YouTube date where it is missing, otherwise /latest would order the
 * whole catalogue by null.
 */
async function runPublish(job: Job<BackfillJobData>): Promise<BackfillProgress> {
  const pending = await prisma.video.findMany({
    where: { status: VideoStatus.INGESTING },
    select: { id: true, publishedAt: true, ytPublishedAt: true },
  });

  let promoted = 0;
  for (const v of pending) {
    await prisma.video.update({
      where: { id: v.id },
      data: {
        status: VideoStatus.PUBLISHED,
        publishedAt: v.publishedAt ?? v.ytPublishedAt,
      },
    });
    promoted += 1;
  }

  const p: BackfillProgress = {
    processed: promoted,
    total: pending.length,
    created: 0,
    updated: 0,
    promoted,
    failed: 0,
    message: `published ${promoted} videos`,
  };
  await job.updateProgress({ ...p });
  await job.log(p.message);
  return p;
}

async function handler(job: Job<BackfillJobData>): Promise<BackfillProgress> {
  const data = backfillJobSchema.parse(job.data);
  return data.mode === "publish" ? runPublish(job) : runImport(job, data);
}

let queue: Queue<BackfillJobData> | null = null;

/**
 * Start the backfill worker. Returns null when YouTube is unconfigured, so the
 * worker boots normally on a stack that has no API key yet.
 */
export function initializeBackfillQueue(): Queue<BackfillJobData> | null {
  if (!env.YOUTUBE_API_KEY || !env.YOUTUBE_CHANNEL_ID) {
    console.log("[backfill] BLOCKED: missing YOUTUBE_API_KEY or YOUTUBE_CHANNEL_ID");
    return null;
  }
  if (queue) return queue;

  queue = new Queue<BackfillJobData>(QUEUE_NAMES.backfill, { connection });

  // concurrency 1: one catalogue-wide import at a time, by design.
  const worker = new Worker<BackfillJobData>(QUEUE_NAMES.backfill, handler, {
    connection,
    concurrency: 1,
  });
  worker.on("failed", (job, err) => {
    console.error(`[backfill] job ${job?.id} failed:`, err.message);
  });
  worker.on("completed", (job) => {
    console.log(`[backfill] job ${job.id} completed`);
  });

  return queue;
}

export { BACKFILL_JOB_NAME };
