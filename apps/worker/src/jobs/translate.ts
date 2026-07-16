import { completeJson, prompts } from "@vaidyasala/core/ai";
import { transcriptSegmentSchema, translationResultSchema } from "@vaidyasala/core/validation";
import type { StageFactory } from "../pipeline/deps";

/**
 * Step 3 — TRANSLATE (§8.2). Segment-aligned English so the EN transcript stays
 * clickable. Idempotent: skips if english already set.
 */
export const translateStage: StageFactory = (deps) => async ({ videoId }) => {
  const transcript = await deps.prisma.transcript.findUnique({ where: { videoId } });
  if (!transcript) throw new Error(`translate: no transcript for ${videoId}`);
  if (transcript.english) {
    deps.log(`[translate] ${videoId} already translated — skip`);
    return { videoId, costUsd: 0 };
  }

  const segments = transcriptSegmentSchema.array().parse(transcript.segments);
  const { data, cost } = await completeJson(
    deps.llm,
    prompts.translatePrompt(segments),
    translationResultSchema,
  );

  const enByStart = new Map(data.segments.map((s) => [s.startSec, s.textEn]));
  const merged = segments.map((s) => ({ ...s, textEn: enByStart.get(s.startSec) ?? s.textEn }));

  await deps.prisma.transcript.update({
    where: { videoId },
    data: { english: data.english, segments: merged },
  });
  deps.log(`[translate] ${videoId} ${data.segments.length} segments`);
  return { videoId, costUsd: cost.usd };
};
