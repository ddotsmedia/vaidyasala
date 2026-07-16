import { QUEUE_NAMES, idempotencyKey, type IngestJobData } from "@vaidyasala/core/queue";
import { prisma } from "@vaidyasala/db";
import { queues, JOB_OPTS } from "./queues";
import { contentHash } from "./lib/hash";
import { mirrorJob } from "./lib/job-mirror";

/**
 * Enqueue an INGEST job (idempotent by {youtubeId}) and mirror it as `queued`
 * in the Job table. Shared by the poll cron; the web endpoints have their own
 * mirror (they can't import the worker — §3).
 */
export async function enqueueIngest(data: IngestJobData): Promise<string> {
  const jobId = idempotencyKey("ingest", data.youtubeId, contentHash(data.youtubeId));
  await queues[QUEUE_NAMES.ingest].add("ingest", data, { ...JOB_OPTS, jobId });
  await mirrorJob(prisma, { id: jobId, kind: "ingest", status: "queued", attempts: 0 });
  return jobId;
}
