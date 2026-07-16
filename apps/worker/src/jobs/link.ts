import { relatedScore } from "@vaidyasala/core/content";
import { nearestVideos } from "../pipeline/vectors";
import type { StageFactory } from "../pipeline/deps";

/**
 * Step 8 — LINK (§8.2). TopicVideo scores (primary + keyword-synonym matches) and
 * the RelatedEdge graph (§2 formula: 0.6·embedding + 0.25·co-topic + 0.15·co-watch;
 * co-watch is 0 until Phase 5). Idempotent: replaces this video's outbound edges.
 */
export const linkStage: StageFactory = (deps) => async ({ videoId }) => {
  const video = await deps.prisma.video.findUnique({
    where: { id: videoId },
    include: { keywords: true },
  });
  if (!video) throw new Error(`link: no video ${videoId}`);

  // ── TopicVideo ──
  if (video.primaryTopicId) {
    await deps.prisma.topicVideo.upsert({
      where: { topicId_videoId: { topicId: video.primaryTopicId, videoId } },
      create: { topicId: video.primaryTopicId, videoId, score: 1 },
      update: { score: 1 },
    });
  }
  const kwTerms = new Set(
    video.keywords.flatMap((k) => [k.termMl, k.termEn].filter(Boolean).map((t) => t!.toLowerCase())),
  );
  if (kwTerms.size > 0) {
    const topics = await deps.prisma.topic.findMany({ select: { id: true, synonyms: true } });
    for (const t of topics) {
      if (t.id === video.primaryTopicId) continue;
      const syns = Array.isArray(t.synonyms) ? (t.synonyms as unknown[]) : [];
      const hit = syns.some((s) => typeof s === "string" && kwTerms.has(s.toLowerCase()));
      if (hit) {
        await deps.prisma.topicVideo.upsert({
          where: { topicId_videoId: { topicId: t.id, videoId } },
          create: { topicId: t.id, videoId, score: 0.5 },
          update: {},
        });
      }
    }
  }

  // ── RelatedEdge (semantic + co-topic) ──
  let edges = 0;
  try {
    const neighbors = await nearestVideos(deps.prisma, videoId, 8);
    if (neighbors.length > 0) {
      const others = await deps.prisma.video.findMany({
        where: { id: { in: neighbors.map((n) => n.id) } },
        select: { id: true, primaryTopicId: true },
      });
      const topicById = new Map(others.map((o) => [o.id, o.primaryTopicId]));
      await deps.prisma.relatedEdge.deleteMany({ where: { fromId: videoId } });
      for (const n of neighbors) {
        const coTopic =
          video.primaryTopicId && topicById.get(n.id) === video.primaryTopicId ? 1 : 0;
        const score = relatedScore({ embedding: n.similarity, coTopic, coWatch: 0 });
        const reason = coTopic && n.similarity < 0.5 ? "same-topic" : "semantic";
        await deps.prisma.relatedEdge.upsert({
          where: { fromId_toId: { fromId: videoId, toId: n.id } },
          create: { fromId: videoId, toId: n.id, score, reason },
          update: { score, reason },
        });
        // Reciprocal edge so watch-next is symmetric.
        await deps.prisma.relatedEdge.upsert({
          where: { fromId_toId: { fromId: n.id, toId: videoId } },
          create: { fromId: n.id, toId: videoId, score, reason },
          update: { score, reason },
        });
        edges++;
      }
    }
  } catch (err) {
    deps.log(`[link] ${videoId} related-edge skipped: ${(err as Error).message}`);
  }

  deps.log(`[link] ${videoId} ${edges} related edges`);
  return { videoId, costUsd: 0 };
};
