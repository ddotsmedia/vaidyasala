"use server";
import { updateTag, revalidatePath } from "next/cache";
import { prisma, VideoStatus } from "@vaidyasala/db";
import { authorize } from "@/lib/authz";
import { enqueueSeoPing } from "@/lib/queue";
import { absoluteUrl } from "@/lib/seo";

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

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: { primaryTopic: { select: { slug: true } }, article: { select: { slug: true } } },
  });
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

  // Publish fan-out (§9.2): cache invalidation (revalidateTag) is done inline;
  // sitemap/RSS are dynamic (regenerate on next request); IndexNow + Google ping
  // and og-image/edges run in the worker via the seo-ping ops job.
  updateTag(`video:${videoId}`);
  updateTag("home");
  if (video.primaryTopic) updateTag(`topic:${video.primaryTopic.slug}`);
  revalidatePath("/admin/videos");

  const urls = [
    absoluteUrl(`/watch/${video.slug}`),
    absoluteUrl("/"),
    ...(video.primaryTopic ? [absoluteUrl(`/topics/${video.primaryTopic.slug}`)] : []),
    ...(video.article ? [absoluteUrl(`/articles/${video.article.slug}`)] : []),
  ];
  await enqueueSeoPing({ urls, reason: "publish" }).catch(() => {
    /* ping is best-effort — never fail the publish on a queue hiccup */
  });
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
