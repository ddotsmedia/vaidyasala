/**
 * Queue contract shared by apps/web (enqueue side) and apps/worker (consume
 * side). Pure: names, the §8.2 pipeline stage order, job-input Zod schemas, and
 * idempotency-key helpers only — NO bullmq/ioredis here so this stays importable
 * from React server code and the worker alike (§3 import rules).
 */
import { z } from "zod";

/** BullMQ queue names (unique-prefixed per LAW 6). */
export const QUEUE_NAMES = {
  ingest: "vaidyasala.ingest",
  pipeline: "vaidyasala.pipeline",
  ops: "vaidyasala.ops",
  dlq: "vaidyasala.dlq",
} as const;
export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/**
 * Per-video AI chain (§8.2), in dependency order. INGEST runs first on its own
 * queue; these ten stages form the pipeline flow that ingest enqueues. The flow
 * is built so the deepest child (`asr`) runs first and completion bubbles up to
 * the parent (`quality-gate`) — see apps/worker/src/queues/flow.ts.
 */
export const PIPELINE_STAGES = [
  "asr",
  "correct",
  "translate",
  "chapterize",
  "enrich",
  "article",
  "embed",
  "link",
  "index-search",
  "quality-gate",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

/** Ops queue job kinds (§9.3 cron). */
export const OPS_JOBS = {
  ytPoll: "yt-poll",
  statsRefresh: "stats-refresh",
} as const;
export type OpsJob = (typeof OPS_JOBS)[keyof typeof OPS_JOBS];

/** Job kinds mirrored to the `Job` table (§2). */
export type JobKind = "ingest" | PipelineStage | OpsJob;

/**
 * Idempotency key `{kind}:{videoId}:{contentHash}` (§9.3). Doubles as the BullMQ
 * jobId (BullMQ dedups by jobId) AND the mirrored `Job.id`, so re-running a
 * completed step with unchanged inputs is a no-op.
 */
export function idempotencyKey(kind: string, videoId: string, contentHash: string): string {
  return `${kind}:${videoId}:${contentHash}`;
}

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extract the 11-char YouTube video id from a watch/share/shorts/embed URL, or
 * accept a bare id. Returns null if nothing valid is found.
 */
export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (YT_ID_RE.test(raw)) return raw;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0] ?? "";
    return YT_ID_RE.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const v = url.searchParams.get("v");
    if (v && YT_ID_RE.test(v)) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    // /shorts/{id}, /embed/{id}, /v/{id}, /live/{id}
    if (parts.length >= 2 && ["shorts", "embed", "v", "live"].includes(parts[0]!)) {
      const id = parts[1]!;
      return YT_ID_RE.test(id) ? id : null;
    }
  }
  return null;
}

/** Ingest trigger provenance — recorded for observability, not behavior. */
export const ingestSourceSchema = z.enum(["manual", "websub", "poll", "backfill"]);
export type IngestSource = z.infer<typeof ingestSourceSchema>;

/**
 * Ingest job input (§2B). Accepts either a full URL or a bare id; normalizes to
 * `{ youtubeId, source }`. Shared by the admin endpoint, the webhook, and the
 * poll cron — one contract everywhere (§3).
 */
export const ingestInputSchema = z
  .object({
    url: z.string().trim().min(1).optional(),
    youtubeId: z.string().trim().min(1).optional(),
    source: ingestSourceSchema.default("manual"),
  })
  .transform((val, ctx) => {
    const candidate = val.youtubeId ?? val.url;
    if (!candidate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "url or youtubeId is required" });
      return z.NEVER;
    }
    const youtubeId = parseYouTubeId(candidate);
    if (!youtubeId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "could not parse a YouTube video id" });
      return z.NEVER;
    }
    return { youtubeId, source: val.source };
  });
export type IngestInput = z.infer<typeof ingestInputSchema>;
export type IngestJobData = { youtubeId: string; source: IngestSource };
