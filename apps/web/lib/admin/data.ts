import "server-only";
import { prisma, type VideoStatus } from "@vaidyasala/db";

export interface JobRow {
  id: string;
  kind: string;
  videoId: string | null;
  status: string;
  attempts: number;
  error: string | null;
  costUsd: number | null;
  updatedAt: string;
}

/** Recent Job rows (the BullMQ mirror, §2) for the QueueBoard. */
export async function getJobSnapshot(limit = 100): Promise<JobRow[]> {
  const jobs = await prisma.job.findMany({ orderBy: { updatedAt: "desc" }, take: limit });
  return jobs.map((j) => ({
    id: j.id,
    kind: j.kind,
    videoId: j.videoId,
    status: j.status,
    attempts: j.attempts,
    error: j.error,
    costUsd: j.costUsd ? Number(j.costUsd) : null,
    updatedAt: j.updatedAt.toISOString(),
  }));
}

/** Videos for the admin DataTable, optionally filtered by status. */
export async function getVideos(status?: VideoStatus) {
  return prisma.video.findMany({
    where: status ? { status } : undefined,
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { primaryTopic: { select: { nameMl: true, slug: true } } },
  });
}

/** Full record for the draft-review page. */
export async function getVideoForReview(id: string) {
  return prisma.video.findUnique({
    where: { id },
    include: {
      primaryTopic: { select: { nameMl: true, nameEn: true, slug: true } },
      transcript: true,
      enrichment: true,
      article: true,
      chapters: { orderBy: { startSec: "asc" } },
      faqs: { orderBy: { order: "asc" } },
      keywords: true,
    },
  });
}
