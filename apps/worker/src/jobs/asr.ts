import { mediaKeys } from "../storage/s3";
import type { StageFactory } from "../pipeline/deps";

/**
 * Step 1 — ASR (§8.2). Transcribe the stored audio (Sarvam primary) → Transcript
 * rawMl + segments. Idempotent: skips if a raw transcript already exists.
 */
export const asrStage: StageFactory = (deps) => async ({ videoId, youtubeId }) => {
  const existing = await deps.prisma.transcript.findUnique({ where: { videoId } });
  if (existing?.rawMl) {
    deps.log(`[asr] ${videoId} already transcribed — skip`);
    return { videoId, costUsd: 0 };
  }
  const ref = { bucket: deps.storage.bucket, key: mediaKeys.audio(youtubeId) };
  const { result, cost } = await deps.asr.transcribe(ref, "ml");
  await deps.prisma.transcript.upsert({
    where: { videoId },
    create: {
      videoId,
      rawMl: result.rawMl,
      segments: result.segments,
      asrProvider: result.asrProvider,
      qualityScore: result.qualityScore ?? null,
    },
    update: {
      rawMl: result.rawMl,
      segments: result.segments,
      asrProvider: result.asrProvider,
    },
  });
  deps.log(`[asr] ${videoId} ${result.segments.length} segments via ${result.asrProvider}`);
  return { videoId, costUsd: cost.usd };
};
