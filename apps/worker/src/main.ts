import { Worker, type Job } from "bullmq";
import { CORE_VERSION } from "@vaidyasala/core";
import { OPS_JOBS, type PipelineStage } from "@vaidyasala/core/queue";
import { prisma } from "@vaidyasala/db";
import { env } from "./env";
import { connection } from "./redis";
import { queues, QUEUE_NAMES, dlq } from "./queues";
import {
  enqueueVideoPipeline,
  pipelineStageCount,
  getPipelineProcessor,
  closeFlowProducer,
  type PipelineJobData,
} from "./queues/flow";
import { registerCron } from "./cron";
import { runMirrored } from "./lib/process";
import { createPipelineDepsFromEnv } from "./pipeline/deps";
import { registerPipelineStages } from "./pipeline/register";
import { createStorageFromEnv } from "./storage/s3";
import { createMetadataFetcher } from "./youtube/metadata";
import { createAudioExtractor } from "./youtube/audio";
import { createIngestProcessor } from "./jobs/ingest";
import { createStatsRefreshProcessor } from "./jobs/stats-refresh";
import { createYtPollProcessor } from "./jobs/yt-poll";
import { createSeoPingProcessor } from "./jobs/seo-ping";
import { createNewsletterAssembleProcessor } from "./jobs/newsletter-assemble";
import {
  createSeoPullProcessor,
  createLinkCrawlProcessor,
  createSearchConsistencyProcessor,
} from "./jobs/nightly";
import { seoPingInputSchema } from "@vaidyasala/core/queue";
import { enqueueIngest } from "./enqueue";

const log = (msg: string): void => console.log(msg);

/** Copy a terminally-failed job into the DLQ for admin visibility (§2B). */
function attachDlq(worker: Worker): void {
  worker.on("failed", (job: Job | undefined, err: Error) => {
    if (!job) return;
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) return; // will retry
    void dlq.add(
      job.name,
      { queue: job.queueName, data: job.data as unknown, failedReason: err.message },
      { jobId: `dlq:${job.id}` },
    );
  });
}

async function main(): Promise<void> {
  log(
    `[worker] boot · core@${CORE_VERSION} · concurrency=${env.WORKER_CONCURRENCY} · ` +
      `storage=${createStorageFromEnv().enabled ? "on" : "off"} · ytApi=${
        env.YOUTUBE_API_KEY ? "on" : "off(yt-dlp)"
      }`,
  );
  await Promise.all(Object.values(queues).map((q) => q.waitUntilReady()));

  // Register the §8.2 pipeline stages first, so ingest enqueues the flow (2C).
  registerPipelineStages(createPipelineDepsFromEnv(log));

  const storage = createStorageFromEnv();
  const ingest = createIngestProcessor({
    prisma,
    storage,
    metadata: createMetadataFetcher(),
    audio: createAudioExtractor(),
    enqueuePipeline:
      pipelineStageCount() > 0
        ? async (videoId, youtubeId) => {
            await enqueueVideoPipeline(videoId, youtubeId);
          }
        : null,
    log,
  });
  const statsRefresh = createStatsRefreshProcessor({ prisma, apiKey: env.YOUTUBE_API_KEY, log });
  const ytPoll = createYtPollProcessor({
    prisma,
    apiKey: env.YOUTUBE_API_KEY,
    channelId: env.YOUTUBE_CHANNEL_ID,
    enqueueIngest,
    log,
  });
  const seoPing = createSeoPingProcessor({
    siteUrl: env.SITE_URL,
    indexNowKey: env.INDEXNOW_KEY,
    log,
  });
  const newsletterAssemble = createNewsletterAssembleProcessor({
    prisma,
    siteUrl: env.SITE_URL,
    log,
  });
  const seoPull = createSeoPullProcessor({ prisma, siteUrl: env.SITE_URL, log });
  const linkCrawl = createLinkCrawlProcessor({ prisma, siteUrl: env.SITE_URL, log });
  const searchConsistency = createSearchConsistencyProcessor({ prisma, siteUrl: env.SITE_URL, log });

  const workers: Worker[] = [
    new Worker(QUEUE_NAMES.ingest, (job) => runMirrored(prisma, job, () => ingest(job.data)), {
      connection,
      concurrency: env.WORKER_CONCURRENCY,
    }),
    new Worker(
      QUEUE_NAMES.ops,
      (job) =>
        runMirrored(prisma, job, async () => {
          let r: { costUsd: number };
          if (job.name === OPS_JOBS.statsRefresh) r = await statsRefresh();
          else if (job.name === OPS_JOBS.seoPing)
            r = await seoPing(seoPingInputSchema.parse(job.data));
          else if (job.name === OPS_JOBS.newsletterAssemble) r = await newsletterAssemble();
          else if (job.name === OPS_JOBS.seoPull) r = await seoPull();
          else if (job.name === OPS_JOBS.linkCrawl) r = await linkCrawl();
          else if (job.name === OPS_JOBS.searchConsistency) r = await searchConsistency();
          else r = await ytPoll();
          return { costUsd: r.costUsd };
        }),
      { connection, concurrency: 2 },
    ),
    new Worker(
      QUEUE_NAMES.pipeline,
      (job: Job<PipelineJobData>) => {
        const proc = getPipelineProcessor(job.name as PipelineStage);
        if (!proc) throw new Error(`no processor registered for pipeline stage "${job.name}" (2C)`);
        return runMirrored(prisma, job, () => proc(job.data));
      },
      { connection, concurrency: env.WORKER_CONCURRENCY },
    ),
  ];
  workers.forEach(attachDlq);

  await registerCron();
  log(`[worker] ready · workers=${workers.length} · pipelineStages=${pipelineStageCount()}`);

  const shutdown = async (signal: string): Promise<void> => {
    log(`[worker] ${signal} received, draining`);
    await Promise.all(workers.map((w) => w.close()));
    await closeFlowProducer();
    await Promise.all(Object.values(queues).map((q) => q.close()));
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err: unknown) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
