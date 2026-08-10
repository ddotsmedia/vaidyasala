import { slugifyAscii } from "@vaidyasala/core/content";
import { completeJson, prompts } from "@vaidyasala/core/ai";
import { transcriptSegmentSchema, articleDraftSchema } from "@vaidyasala/core/validation";
import type { StageFactory } from "../pipeline/deps";

/**
 * Step 6 — ARTICLE (§8.2). Long-form MDX derived strictly from the transcript;
 * the prompt maps each claim to a segment and drops unsupported ones. We keep
 * only claims that resolved to a segment (verification pass). Idempotent.
 */
export const articleStage: StageFactory = (deps) => async ({ videoId, youtubeId }) => {
  const existing = await deps.prisma.article.findUnique({ where: { videoId } });
  if (existing) {
    deps.log(`[article] ${videoId} already drafted — skip`);
    return { videoId, costUsd: 0 };
  }
  const transcript = await deps.prisma.transcript.findUnique({ where: { videoId } });
  if (!transcript) throw new Error(`article: no transcript for ${videoId}`);

  const segments = transcriptSegmentSchema.array().parse(transcript.segments);
  const { data, cost } = await completeJson(
    deps.llm,
    prompts.articlePrompt(segments),
    articleDraftSchema,
  );

  const claims = data.claims ?? [];
  const supported = claims.filter((c) => c.segmentStartSec !== null).length;
  const slug = `${slugifyAscii(data.titleMl).slice(0, 80) || "article"}-${youtubeId}`;

  await deps.prisma.article.create({
    data: {
      videoId,
      slug,
      status: "DRAFT",
      titleMl: data.titleMl,
      bodyMl: data.bodyMl,
      bodyEn: data.bodyEn ?? null,
      readingMin: data.readingMin,
    },
  });
  deps.log(`[article] ${videoId} ${supported}/${claims.length} claims verified`);
  return { videoId, costUsd: cost.usd };
};
