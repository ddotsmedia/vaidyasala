import { chunkText, changedRatio } from "@vaidyasala/core/content";
import { completeJson, prompts } from "@vaidyasala/core/ai";
import { correctionResultSchema } from "@vaidyasala/core/validation";
import type { StageFactory } from "../pipeline/deps";

/**
 * Step 2 — CORRECT (§8.2). Fix ASR Malayalam in ~3k-token overlapping chunks;
 * diff-guard: overall changed-ratio > 40% flags the transcript for human review.
 * Idempotent: skips if correctedMl already set.
 */
export const correctStage: StageFactory = (deps) => async ({ videoId }) => {
  const transcript = await deps.prisma.transcript.findUnique({ where: { videoId } });
  if (!transcript?.rawMl) throw new Error(`correct: no raw transcript for ${videoId}`);
  if (transcript.correctedMl) {
    deps.log(`[correct] ${videoId} already corrected — skip`);
    return { videoId, costUsd: 0 };
  }

  const chunks = chunkText(transcript.rawMl);
  const pieces: string[] = [];
  let usd = 0;
  for (const chunk of chunks) {
    const { data, cost } = await completeJson(
      deps.llm,
      prompts.correctMlPrompt(chunk, deps.glossary),
      correctionResultSchema,
    );
    pieces.push(data.correctedMl);
    usd += cost.usd;
  }
  const correctedMl = pieces.join(" ").trim();
  const ratio = changedRatio(transcript.rawMl, correctedMl);
  const flagged = ratio > 0.4;

  await deps.prisma.transcript.update({
    where: { videoId },
    data: {
      correctedMl,
      qualityScore: Number((1 - ratio).toFixed(2)),
    },
  });
  deps.log(`[correct] ${videoId} changedRatio=${ratio}${flagged ? " FLAGGED" : ""}`);
  return { videoId, costUsd: Number(usd.toFixed(6)) };
};
