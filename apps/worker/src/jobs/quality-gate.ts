import { VideoStatus } from "@vaidyasala/db";
import type { StageFactory } from "../pipeline/deps";

/** Publish-quality threshold (§8.2 step 10). Below ⇒ DRAFT flagged for review. */
export const QUALITY_THRESHOLD = 0.6;

/**
 * Step 10 — QUALITY GATE (§8.2/§8.3). Composite score from transcript quality +
 * enrichment/article presence → Video.qualityScore; flips PROCESSING → DRAFT.
 * Nothing auto-publishes (§8.3) — the editor promotes DRAFT → PUBLISHED in admin.
 */
export const qualityGateStage: StageFactory = (deps) => async ({ videoId }) => {
  const video = await deps.prisma.video.findUnique({
    where: { id: videoId },
    include: {
      transcript: { select: { qualityScore: true, correctedMl: true } },
      enrichment: { select: { id: true } },
      article: { select: { id: true } },
    },
  });
  if (!video) throw new Error(`quality-gate: no video ${videoId}`);

  const transcriptQuality = video.transcript?.qualityScore ?? (video.transcript?.correctedMl ? 0.7 : 0.4);
  const hasEnrichment = video.enrichment ? 1 : 0;
  const hasArticle = video.article ? 1 : 0;
  const composite = Number(
    (0.5 * transcriptQuality + 0.25 * hasEnrichment + 0.25 * hasArticle).toFixed(3),
  );

  // §1.3 internal-link rule: no orphan pages — a publish-ready page needs ≥3
  // inbound internal links (related edges pointing here + topic memberships +
  // its companion article). Below that stays DRAFT flagged.
  const [inboundEdges, topicLinks] = await Promise.all([
    deps.prisma.relatedEdge.count({ where: { toId: videoId } }),
    deps.prisma.topicVideo.count({ where: { videoId } }),
  ]);
  const inboundLinks = inboundEdges + topicLinks + hasArticle;
  const flagged = composite < QUALITY_THRESHOLD || inboundLinks < 3;

  await deps.prisma.video.update({
    where: { id: videoId },
    data: { qualityScore: composite, status: VideoStatus.DRAFT },
  });
  deps.log(
    `[quality-gate] ${videoId} score=${composite} inbound=${inboundLinks}${
      flagged ? " FLAGGED" : " ready"
    } → DRAFT`,
  );
  return { videoId, costUsd: 0 };
};
