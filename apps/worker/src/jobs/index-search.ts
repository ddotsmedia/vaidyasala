import { buildVideoSearchDoc } from "@vaidyasala/core/search";
import type { StageFactory } from "../pipeline/deps";

/**
 * Step 9 — INDEX (§8.2). Build the Meilisearch document (mapper) and upsert it.
 * The index CONFIG lands in Phase 4; when Meili is unconfigured this stage maps
 * the doc and no-ops the upsert (Meilisearch is a rebuildable projection).
 */
export const indexSearchStage: StageFactory = (deps) => async ({ videoId }) => {
  const video = await deps.prisma.video.findUnique({
    where: { id: videoId },
    include: {
      primaryTopic: { select: { slug: true, nameMl: true, nameEn: true } },
      enrichment: { select: { summaryMl: true, summaryEn: true } },
      transcript: { select: { correctedMl: true } },
      keywords: { select: { termMl: true, termEn: true } },
      chapters: { select: { titleMl: true, titleEn: true } },
      faqs: { select: { questionMl: true } },
    },
  });
  if (!video) throw new Error(`index-search: no video ${videoId}`);

  // Video.stats is free-form JSON from the YouTube sync; read views defensively.
  const stats = video.stats as { views?: unknown } | null;
  const views = typeof stats?.views === "number" ? stats.views : null;

  const doc = buildVideoSearchDoc({
    id: video.id,
    slug: video.slug,
    titleMl: video.titleMl,
    titleEn: video.titleEn,
    status: video.status,
    durationSec: video.durationSec,
    publishedAt: video.publishedAt,
    viewCount: views,
    primaryTopic: video.primaryTopic,
    summaryMl: video.enrichment?.summaryMl,
    summaryEn: video.enrichment?.summaryEn,
    keywords: video.keywords,
    chapters: video.chapters,
    faqs: video.faqs,
    transcriptMl: video.transcript?.correctedMl,
  });

  if (deps.meili) {
    await deps.meili.upsertVideos([doc]);
    deps.log(`[index-search] ${videoId} upserted to Meili`);
  } else {
    deps.log(`[index-search] ${videoId} mapped; Meili unconfigured — skip upsert`);
  }
  return { videoId, costUsd: 0 };
};
