import type { PrismaClient } from "@vaidyasala/db";
import { mirrorJob } from "./job-mirror";

/** Minimal shape of a BullMQ Job needed for mirroring. */
export interface JobLike<T> {
  id?: string;
  name: string;
  data: T;
  attemptsMade: number;
}

/** Result a mirrored processor may return to enrich the `Job` row. */
export interface MirroredResult {
  videoId?: string | null;
  costUsd?: number | null;
}

/**
 * Run a processor while mirroring its lifecycle (active → done|failed) into the
 * `Job` table (§2B: mirror on every state change). Rethrows so BullMQ handles
 * retry/backoff/DLQ.
 */
export async function runMirrored<T, R extends MirroredResult | void>(
  prisma: PrismaClient,
  job: JobLike<T>,
  fn: () => Promise<R>,
): Promise<R> {
  const id = job.id ?? `${job.name}:${JSON.stringify(job.data)}`;
  const attempts = job.attemptsMade + 1;
  await mirrorJob(prisma, { id, kind: job.name, status: "active", attempts });
  try {
    const result = await fn();
    await mirrorJob(prisma, {
      id,
      kind: job.name,
      status: "done",
      attempts,
      videoId: result?.videoId ?? null,
      costUsd: result?.costUsd ?? null,
    });
    return result;
  } catch (err) {
    await mirrorJob(prisma, {
      id,
      kind: job.name,
      status: "failed",
      attempts,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
