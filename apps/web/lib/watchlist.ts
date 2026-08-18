import "server-only";
import type { VideoCardData } from "@vaidyasala/ui";
import { prisma } from "@vaidyasala/db";
import { getViewerKey } from "./viewer";
import { cardThumbnail } from "./video";

/**
 * Saved videos for the current viewer (§6.1), newest save first.
 *
 * Keyed on viewerKey, not userId: watching needs no account, so a list keyed on
 * a user would be empty for effectively everyone. Anonymous saves ride the
 * "a:*" cookie and are re-keyed to "u:*" on sign-in like watch progress.
 *
 * Read-only, so safe in an RSC — getViewerKey(false) never mints a cookie.
 */
export async function getWatchlist(limit = 60): Promise<VideoCardData[]> {
  const { key } = await getViewerKey(false);
  if (!key) return [];

  const rows = await prisma.videoReaction.findMany({
    where: { viewerKey: key, bookmarked: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: { videoId: true },
  });
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.videoId);
  const videos = await prisma.video.findMany({
    // A video unpublished after being saved must vanish from the list rather
    // than render a card that 404s on click.
    where: { id: { in: ids }, status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      titleMl: true,
      titleEn: true,
      durationSec: true,
      youtubeId: true,
      thumbnails: true,
      primaryTopic: { select: { slug: true, nameMl: true, nameEn: true } },
    },
  });

  // findMany returns id order, not save order — re-sort against `ids`.
  const vmap = new Map(videos.map((v) => [v.id, v]));
  return ids
    .map((id): VideoCardData | null => {
      const v = vmap.get(id);
      if (!v) return null;
      return {
        slug: v.slug,
        titleMl: v.titleMl,
        titleEn: v.titleEn ?? undefined,
        ...cardThumbnail(v.youtubeId, v.thumbnails),
        durationSec: v.durationSec,
        topic: v.primaryTopic ?? undefined,
      };
    })
    .filter((x): x is VideoCardData => x !== null);
}
