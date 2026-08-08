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

  // Long clips go through Sarvam's batch job API, which can run for minutes with
  // no output. Log every 10% so a stuck transcription is visible, without
  // flooding the log on a fast one.
  let lastDecile = -1;
  const { result, cost } = await deps.asr.transcribe(ref, "ml", (p) => {
    const decile = Math.floor(p.ratio * 10);
    if (decile <= lastDecile) return;
    lastDecile = decile;
    deps.log(`[asr] ${videoId} ${p.phase} ${Math.round(p.ratio * 100)}%${p.jobId ? ` job=${p.jobId}` : ""}`);
  });
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
