import "server-only";
import { prisma } from "@vaidyasala/db";
import { getViewerKey } from "./viewer";
import { thumbnailUrl } from "./video";

export interface ContinueItem {
  slug: string;
  titleMl: string;
  titleEn: string | null;
  thumbnailUrl: string;
  durationSec: number;
  positionSec: number;
  progress: number; // 0–1
}

/**
 * Continue-watching list for the current viewer (§6.1/§6.3): in-progress,
 * not-completed videos ordered by recency. Empty when signed out with no device
 * history. Read-only (safe in RSC).
 */
export async function getContinueWatching(limit = 12): Promise<ContinueItem[]> {
  const { key } = await getViewerKey(false);
  if (!key) return [];

  const rows = await prisma.watchProgress.findMany({
    where: { viewerKey: key, completed: false, positionSec: { gt: 5 } },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  if (rows.length === 0) return [];

  const videos = await prisma.video.findMany({
    where: { id: { in: rows.map((r) => r.videoId) }, status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      titleMl: true,
      titleEn: true,
      durationSec: true,
      youtubeId: true,
      thumbnails: true,
    },
  });
  const vmap = new Map(videos.map((v) => [v.id, v]));

  return rows
    .map((r): ContinueItem | null => {
      const v = vmap.get(r.videoId);
      if (!v) return null;
      // Treat >=95% as finished so it drops off the rail.
      const progress = v.durationSec ? Math.min(1, r.positionSec / v.durationSec) : 0;
      if (progress >= 0.95) return null;
      return {
        slug: v.slug,
        titleMl: v.titleMl,
        titleEn: v.titleEn,
        thumbnailUrl: thumbnailUrl(v.youtubeId, v.thumbnails),
        durationSec: v.durationSec,
        positionSec: r.positionSec,
        progress,
      };
    })
    .filter((x): x is ContinueItem => x !== null);
}

/** Saved resume position for one video (§6.1 resume-at-position). */
export async function getResumePosition(videoId: string): Promise<number> {
  const { key } = await getViewerKey(false);
  if (!key) return 0;
  const row = await prisma.watchProgress.findUnique({
    where: { viewerKey_videoId: { viewerKey: key, videoId } },
  });
  if (!row || row.completed) return 0;
  return row.positionSec > 5 ? row.positionSec : 0;
}
