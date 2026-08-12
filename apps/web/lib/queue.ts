import "server-only";
import { createHash } from "node:crypto";
import { Queue, type JobsOptions, type ConnectionOptions } from "bullmq";
import {
  QUEUE_NAMES,
  PIPELINE_STAGES,
  OPS_JOBS,
  idempotencyKey,
  type IngestJobData,
  type SeoPingInput,
} from "@vaidyasala/core/queue";
import { prisma } from "@vaidyasala/db";
import { env } from "./env";

/** BullMQ connection from REDIS_URL (mirrors apps/worker/src/redis.ts). */
function connectionFromUrl(url: string): ConnectionOptions {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    username: u.username || undefined,
    password: u.password || undefined,
    db: u.pathname && u.pathname.length > 1 ? Number(u.pathname.slice(1)) : 0,
    maxRetriesPerRequest: null,
  };
}

const JOB_OPTS: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 5000 },
};

// One set of Queue handles per process, reused across hot reloads (dev).
const globalForQueue = globalThis as unknown as { queues?: Record<string, Queue> };
const connection = connectionFromUrl(env.REDIS_URL);
const queues =
  globalForQueue.queues ??
  {
    [QUEUE_NAMES.ingest]: new Queue(QUEUE_NAMES.ingest, { connection }),
    [QUEUE_NAMES.pipeline]: new Queue(QUEUE_NAMES.pipeline, { connection }),
    [QUEUE_NAMES.ops]: new Queue(QUEUE_NAMES.ops, { connection }),
    [QUEUE_NAMES.backfill]: new Queue(QUEUE_NAMES.backfill, { connection }),
  };
if (process.env.NODE_ENV !== "production") globalForQueue.queues = queues;
const ingestQueue = queues[QUEUE_NAMES.ingest]!;
const opsQueue = queues[QUEUE_NAMES.ops]!;

const PIPELINE_SET = new Set<string>(PIPELINE_STAGES);
/** Map a Job.kind (§2 mirror) to the BullMQ queue that owns it. */
function queueForKind(kind: string): Queue | undefined {
  if (kind === "ingest") return queues[QUEUE_NAMES.ingest];
  if (PIPELINE_SET.has(kind)) return queues[QUEUE_NAMES.pipeline];
  return queues[QUEUE_NAMES.ops];
}

/** Retry a failed job by its mirror id (= BullMQ jobId). Returns false if absent. */
export async function retryJob(jobId: string, kind: string): Promise<boolean> {
  const queue = queueForKind(kind);
  if (!queue) return false;
  const job = await queue.getJob(jobId);
  if (!job) return false;
  const state = await job.getState();
  if (state === "failed") {
    await job.retry();
  } else {
    await job.promote().catch(() => {});
  }
  await prisma.job.update({ where: { id: jobId }, data: { status: "queued", error: null } });
  return true;
}

function contentHash(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 12);
}

/**
 * Enqueue an INGEST job and mirror it as `queued` in the Job table. Idempotent
 * by {youtubeId} (§9.3) — a duplicate webhook/admin submit is a no-op.
 */
export async function enqueueIngest(data: IngestJobData): Promise<string> {
  const jobId = idempotencyKey("ingest", data.youtubeId, contentHash(data.youtubeId));
  await ingestQueue.add("ingest", data, { ...JOB_OPTS, jobId });
  await prisma.job.upsert({
    where: { id: jobId },
    create: { id: jobId, kind: "ingest", status: "queued", attempts: 0 },
    update: { status: "queued" },
  });
  return jobId;
}

/**
 * Enqueue a seo-ping ops job (§7.2/§9.2 publish fan-out): submit fresh URLs to
 * IndexNow + Google. Mirrored to the Job table; keyed by content so repeated
 * publishes of the same URL set coalesce.
 */
export async function enqueueSeoPing(input: SeoPingInput): Promise<string> {
  const jobId = idempotencyKey("seo-ping", input.reason, contentHash(input.urls.join("|")));
  await opsQueue.add(OPS_JOBS.seoPing, input, { ...JOB_OPTS, jobId });
  await prisma.job.upsert({
    where: { id: jobId },
    create: { id: jobId, kind: "seo-ping", status: "queued", attempts: 0 },
    update: { status: "queued" },
  });
  return jobId;
}

/** The backfill queue, shared with the worker via QUEUE_NAMES (§7B step 2). */
export const backfillQueue = queues[QUEUE_NAMES.backfill]!;
