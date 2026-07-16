import { transcriptSegmentSchema } from "@vaidyasala/core/validation";
import { writeVideoEmbedding, writeSegmentVectors } from "../pipeline/vectors";
import type { StageFactory } from "../pipeline/deps";

/**
 * Step 7 — EMBED (§8.2). One batch: [video (title+summary), ...segments] → the
 * video-level embedding + per-segment vectors (pgvector, raw SQL). Idempotent by
 * overwrite (writeSegmentVectors deletes existing rows first).
 */
export const embedStage: StageFactory = (deps) => async ({ videoId }) => {
  const video = await deps.prisma.video.findUnique({
    where: { id: videoId },
    include: { enrichment: true, transcript: true },
  });
  if (!video?.transcript) throw new Error(`embed: no transcript for ${videoId}`);

  const segments = transcriptSegmentSchema.array().parse(video.transcript.segments);
  const videoText = [video.titleMl, video.enrichment?.summaryMl].filter(Boolean).join(". ");
  const inputs = [videoText, ...segments.map((s) => s.textMl)];

  const { vectors, cost } = await deps.embed.embed(inputs);
  const [videoVec, ...segVecs] = vectors;
  if (videoVec) await writeVideoEmbedding(deps.prisma, videoId, videoVec);
  const written = await writeSegmentVectors(deps.prisma, videoId, segments, segVecs);

  deps.log(`[embed] ${videoId} video + ${written} segment vectors`);
  return { videoId, costUsd: cost.usd };
};
