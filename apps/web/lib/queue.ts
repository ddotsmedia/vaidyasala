import "server-only";
import { createHash } from "node:crypto";
import { Queue, type JobsOptions, type ConnectionOptions } from "bullmq";
import { QUEUE_NAMES, idempotencyKey, type IngestJobData } from "@vaidyasala/core/queue";
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

// One Queue per process, reused across hot reloads (dev).
const globalForQueue = globalThis as unknown as { ingestQueue?: Queue };
const ingestQueue =
  globalForQueue.ingestQueue ??
  new Queue(QUEUE_NAMES.ingest, { connection: connectionFromUrl(env.REDIS_URL) });
if (process.env.NODE_ENV !== "production") globalForQueue.ingestQueue = ingestQueue;

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
