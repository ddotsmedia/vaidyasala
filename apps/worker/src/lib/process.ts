import type { PrismaClient } from "@vaidyasala/db";
import { mirrorJob } from "./job-mirror";
import { capturePipelineError, withJobSpan } from "../monitoring/sentry";

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
  const ids = extractIds(job.data);
  await mirrorJob(prisma, { id, kind: job.name, status: "active", attempts });
  try {
    const result = await withJobSpan(
      `pipeline.${job.name}`,
      { "job.id": id, "job.attempt": attempts, "video.id": ids.videoId },
      fn,
    );
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
    // Every stage failure funnels through here, so this is the one place that
    // needs to know how to describe a pipeline error to Sentry.
    capturePipelineError(err, { stage: job.name, jobId: id, attempt: attempts, ...ids });
    throw err;
  }
}

/** Best-effort ids from an opaque job payload — used only for error context. */
function extractIds(data: unknown): { videoId?: string; youtubeId?: string } {
  if (typeof data !== "object" || data === null) return {};
  const d = data as { videoId?: unknown; youtubeId?: unknown };
  return {
    videoId: typeof d.videoId === "string" ? d.videoId : undefined,
    youtubeId: typeof d.youtubeId === "string" ? d.youtubeId : undefined,
  };
}
