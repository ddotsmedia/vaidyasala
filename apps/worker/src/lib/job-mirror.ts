import type { PrismaClient } from "@vaidyasala/db";
import type { JobKind } from "@vaidyasala/core/queue";

/** BullMQ→admin mirror status (`Job.status`, §2). */
export type JobStatus = "queued" | "active" | "done" | "failed";

export interface JobMirror {
  /** Idempotency key — also the BullMQ jobId (§9.3). */
  id: string;
  kind: JobKind | string;
  videoId?: string | null;
  status: JobStatus;
  attempts?: number;
  error?: string | null;
  costUsd?: number | null;
}

/**
 * Mirror a BullMQ job's state into the `Job` table on every transition (§2B).
 * Upsert-by-id (id = idempotency key) so re-runs update in place rather than
 * accumulating rows.
 */
export async function mirrorJob(prisma: PrismaClient, m: JobMirror): Promise<void> {
  const fields = {
    kind: m.kind,
    videoId: m.videoId ?? null,
    status: m.status,
    ...(m.attempts !== undefined ? { attempts: m.attempts } : {}),
    error: m.error ?? null,
    ...(m.costUsd !== undefined && m.costUsd !== null ? { costUsd: m.costUsd } : {}),
  };
  await prisma.job.upsert({
    where: { id: m.id },
    create: { id: m.id, ...fields },
    update: fields,
  });
}
