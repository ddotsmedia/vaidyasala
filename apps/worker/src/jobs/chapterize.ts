import { completeJson, prompts } from "@vaidyasala/core/ai";
import { transcriptSegmentSchema, chapterSetSchema } from "@vaidyasala/core/validation";
import type { StageFactory } from "../pipeline/deps";

/**
 * Step 4 — CHAPTERIZE (§8.2). Skips when chapters already exist (from YT chapters
 * captured at ingest); otherwise topic-shift segmentation from the transcript.
 */
export const chapterizeStage: StageFactory = (deps) => async ({ videoId }) => {
  const count = await deps.prisma.chapter.count({ where: { videoId } });
  if (count > 0) {
    deps.log(`[chapterize] ${videoId} has ${count} chapters — skip`);
    return { videoId, costUsd: 0 };
  }
  const transcript = await deps.prisma.transcript.findUnique({ where: { videoId } });
  if (!transcript) throw new Error(`chapterize: no transcript for ${videoId}`);

  const segments = transcriptSegmentSchema.array().parse(transcript.segments);
  const { data, cost } = await completeJson(
    deps.llm,
    prompts.chapterizePrompt(segments),
    chapterSetSchema,
  );

  await deps.prisma.chapter.createMany({
    data: data.chapters.map((c) => ({
      videoId,
      startSec: c.startSec,
      titleMl: c.titleMl,
      titleEn: c.titleEn ?? null,
    })),
    skipDuplicates: true,
  });
  deps.log(`[chapterize] ${videoId} ${data.chapters.length} chapters`);
  return { videoId, costUsd: cost.usd };
};
