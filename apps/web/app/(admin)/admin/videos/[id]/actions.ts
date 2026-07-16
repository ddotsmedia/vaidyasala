"use server";
import { updateTag, revalidatePath } from "next/cache";
import { prisma, VideoStatus } from "@vaidyasala/db";
import { authorize } from "@/lib/authz";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Publish a DRAFT video (§6.5). Flips status → PUBLISHED, stamps publishedAt,
 * writes an AuditLog, and fans out cache invalidation. The full publish fan-out
 * (sitemap/IndexNow/RSS/og-image/edges, §9.2) lands in Phase 3C — the
 * revalidateTag calls here are the cache half of it.
 */
export async function publishVideo(videoId: string): Promise<ActionResult> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) return { ok: false, error: authz.reason };

  const video = await prisma.video.findUnique({ where: { id: videoId } });
  if (!video) return { ok: false, error: "not found" };
  if (video.status !== VideoStatus.DRAFT && video.status !== VideoStatus.HIDDEN) {
    return { ok: false, error: `cannot publish from ${video.status}` };
  }

  await prisma.video.update({
    where: { id: videoId },
    data: { status: VideoStatus.PUBLISHED, publishedAt: video.publishedAt ?? new Date() },
  });
  await prisma.article.updateMany({ where: { videoId }, data: { status: "PUBLISHED" } });
  await prisma.auditLog.create({
    data: {
      actorId: authz.ctx!.userId,
      action: "video.publish",
      target: videoId,
      meta: { slug: video.slug },
    },
  });

  // BLOCKED-adjacent: sitemap/IndexNow/RSS/og-image fan-out is Phase 3C (§9.2).
  // updateTag = read-your-own-writes invalidation (Next 16 server-action API).
  updateTag(`video:${videoId}`);
  updateTag("home");
  revalidatePath("/admin/videos");
  return { ok: true };
}

/** Hide a video (reversible). */
export async function hideVideo(videoId: string): Promise<ActionResult> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) return { ok: false, error: authz.reason };
  await prisma.video.update({ where: { id: videoId }, data: { status: VideoStatus.HIDDEN } });
  await prisma.auditLog.create({
    data: { actorId: authz.ctx!.userId, action: "video.hide", target: videoId, meta: {} },
  });
  updateTag(`video:${videoId}`);
  revalidatePath("/admin/videos");
  return { ok: true };
}
