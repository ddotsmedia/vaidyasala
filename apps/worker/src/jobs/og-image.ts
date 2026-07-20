import type { PrismaClient } from "@vaidyasala/db";
import { buildOgSvg } from "@vaidyasala/core/seo";
import type { StoragePort } from "../storage/s3";

export interface OgImageDeps {
  prisma: PrismaClient;
  storage: StoragePort;
  log?: (msg: string) => void;
}

/**
 * OG image (§8.2 / §9.2 publish fan-out). Renders a self-contained 1200×630 SVG
 * card for the video and stores it. (Phase 3D upgrades this to Satori→PNG with
 * the Anek Malayalam font; SVG here keeps it dependency-free and runnable now —
 * see DECISIONS.md.) The card builder is shared with apps/web's /api/og route.
 */
export function createOgImageProcessor(deps: OgImageDeps) {
  const log = deps.log ?? (() => {});
  return async function renderOgImage(videoId: string): Promise<{ key: string; url?: string }> {
    const video = await deps.prisma.video.findUnique({
      where: { id: videoId },
      select: { youtubeId: true, titleMl: true, primaryTopic: { select: { nameMl: true } } },
    });
    if (!video) throw new Error(`og-image: no video ${videoId}`);

    const svg = buildOgSvg({ titleMl: video.titleMl, badgeMl: video.primaryTopic?.nameMl });

    const key = `videos/${video.youtubeId}/og.svg`;
    if (!deps.storage.enabled) {
      log(`[og-image] ${videoId} storage disabled — skip`);
      return { key };
    }
    const res = await deps.storage.put(key, new TextEncoder().encode(svg), "image/svg+xml");
    log(`[og-image] ${videoId} rendered → ${res.key}`);
    return res;
  };
}
