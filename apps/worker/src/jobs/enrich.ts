import { completeJson, prompts } from "@vaidyasala/core/ai";
import { enrichmentResultSchema } from "@vaidyasala/core/validation";
import type { StageFactory } from "../pipeline/deps";

/**
 * Step 5 — ENRICH (§8.2). One structured Claude call → Enrichment row + Faq +
 * Keyword rows. Idempotent: skips if an Enrichment already exists.
 */
export const enrichStage: StageFactory = (deps) => async ({ videoId }) => {
  const existing = await deps.prisma.enrichment.findUnique({ where: { videoId } });
  if (existing) {
    deps.log(`[enrich] ${videoId} already enriched — skip`);
    return { videoId, costUsd: 0 };
  }
  const transcript = await deps.prisma.transcript.findUnique({ where: { videoId } });
  const source = transcript?.correctedMl ?? transcript?.rawMl;
  if (!source) throw new Error(`enrich: no transcript for ${videoId}`);

  const { data, cost } = await completeJson(
    deps.llm,
    prompts.enrichPrompt(source, deps.glossary),
    enrichmentResultSchema,
  );

  await deps.prisma.enrichment.create({
    data: {
      videoId,
      summaryMl: data.summaryMl,
      summaryEn: data.summaryEn,
      keyTakeaways: data.keyTakeaways,
      socialSnippets: data.socialSnippets,
      newsletterMd: data.newsletterMd,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
      modelVersion: cost.model || deps.llm.name,
      generatedAt: new Date(),
    },
  });

  const faqs = data.faqs ?? [];
  const keywords = data.keywords ?? [];

  await deps.prisma.faq.deleteMany({ where: { videoId } });
  if (faqs.length > 0) {
    await deps.prisma.faq.createMany({
      data: faqs.map((f, i) => ({
        videoId,
        questionMl: f.questionMl,
        answerMl: f.answerMl,
        questionEn: f.questionEn ?? null,
        answerEn: f.answerEn ?? null,
        timestampSec: f.timestampSec ?? null,
        order: i,
      })),
    });
  }

  await deps.prisma.keyword.deleteMany({ where: { videoId } });
  if (keywords.length > 0) {
    await deps.prisma.keyword.createMany({
      data: keywords.map((k) => ({
        videoId,
        termMl: k.termMl,
        termEn: k.termEn ?? null,
        kind: k.kind,
      })),
    });
  }

  deps.log(`[enrich] ${videoId} ${faqs.length} faqs, ${keywords.length} keywords`);
  return { videoId, costUsd: cost.usd };
};
