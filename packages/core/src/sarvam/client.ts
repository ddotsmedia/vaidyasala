/**
 * Sarvam.AI client — Malayalam ASR (§8.1). This is the single implementation;
 * `ai/providers/sarvam.ts` is a thin AsrProvider adapter over it, so there is one
 * request/response mapping to maintain, not two.
 *
 * Two transcription paths, because Sarvam exposes two and they suit different clips:
 *   · `speech-to-text`      — synchronous, fine for short audio, one round trip.
 *   · `speech-to-text-job`  — batch job for long audio: submit → poll → collect.
 *     Polling is what makes real progress reporting possible; there is no
 *     server-push stream for pre-recorded files, so "streaming progress" here means
 *     incremental `onProgress` callbacks driven by job status, not an open socket.
 *
 * Long audio through the sync endpoint is the classic way to hit a gateway timeout,
 * so `transcribe()` picks the job path automatically past `jobThresholdSec`.
 */
import { asrResultSchema, type AsrResult } from "../validation/ai";
import type { ProviderCost, R2Ref } from "../ai/types";
import { asrCost } from "../ai/cost";
import { TokenBucket } from "../ai/rate-limit";
import { CircuitBreaker } from "../ai/circuit-breaker";

/** Resolves an R2Ref to a fetchable URL (presigned) — injected so tests stay offline. */
export type AudioUrlResolver = (ref: R2Ref) => Promise<string>;

/** Coarse lifecycle of a transcription, reported as it advances. */
export type SarvamPhase = "resolving" | "submitted" | "transcribing" | "collecting" | "done";

export interface SarvamProgress {
  phase: SarvamPhase;
  /** 0..1. Best-effort: derived from job status, so it steps rather than glides. */
  ratio: number;
  /** Provider job id once submitted — worth logging for support tickets. */
  jobId?: string;
  message?: string;
}

export type ProgressListener = (p: SarvamProgress) => void;

export interface SarvamClientConfig {
  apiKey?: string;
  baseUrl?: string;
  resolveUrl: AudioUrlResolver;
  fetchImpl?: typeof fetch;
  rateLimiter?: TokenBucket;
  breaker?: CircuitBreaker;
  /** Audio at or above this many seconds goes through the batch job API. */
  jobThresholdSec?: number;
  /** Gap between job status polls. */
  pollIntervalMs?: number;
  /** Give up on a job after this long. */
  pollTimeoutMs?: number;
  /** Injected so tests do not actually wait. */
  sleepImpl?: (ms: number) => Promise<void>;
}

export interface TranscribeOptions {
  lang?: "ml";
  /** Known duration, when the caller has it — decides sync vs job without a probe. */
  durationSec?: number;
  onProgress?: ProgressListener;
  signal?: AbortSignal;
  /** Force one path regardless of duration. Mostly for tests. */
  mode?: "sync" | "job";
}

interface SarvamSegmentRaw {
  start?: number;
  end?: number;
  start_time_seconds?: number;
  end_time_seconds?: number;
  text?: string;
  transcript?: string;
}

interface SarvamTranscriptRaw {
  transcript?: string;
  text?: string;
  segments?: SarvamSegmentRaw[];
  timestamps?: SarvamSegmentRaw[];
  duration_seconds?: number;
}

interface SarvamJobStatusRaw {
  job_id?: string;
  job_state?: string;
  status?: string;
  /** Some deployments report percent-complete; treated as optional. */
  progress?: number;
  output?: SarvamTranscriptRaw;
  outputs?: SarvamTranscriptRaw[];
  error_message?: string;
}

const TERMINAL_OK = new Set(["completed", "succeeded", "success", "done"]);
const TERMINAL_FAIL = new Set(["failed", "error", "cancelled", "canceled"]);

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class SarvamClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly resolveUrl: AudioUrlResolver;
  private readonly fetchImpl: typeof fetch;
  private readonly limiter: TokenBucket;
  private readonly breaker: CircuitBreaker;
  private readonly jobThresholdSec: number;
  private readonly pollIntervalMs: number;
  private readonly pollTimeoutMs: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(cfg: SarvamClientConfig) {
    this.apiKey = cfg.apiKey ?? process.env.SARVAM_API_KEY;
    this.baseUrl = (cfg.baseUrl ?? "https://api.sarvam.ai").replace(/\/$/, "");
    this.resolveUrl = cfg.resolveUrl;
    this.fetchImpl = cfg.fetchImpl ?? fetch;
    this.limiter = cfg.rateLimiter ?? new TokenBucket(4, 2);
    this.breaker = cfg.breaker ?? new CircuitBreaker();
    this.jobThresholdSec = cfg.jobThresholdSec ?? 300;
    this.pollIntervalMs = cfg.pollIntervalMs ?? 5_000;
    this.pollTimeoutMs = cfg.pollTimeoutMs ?? 30 * 60_000;
    this.sleep = cfg.sleepImpl ?? defaultSleep;
  }

  get configured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Transcribe stored audio to time-aligned Malayalam segments.
   * Progress is reported through `opts.onProgress` if given.
   */
  async transcribe(
    audio: R2Ref,
    opts: TranscribeOptions = {},
  ): Promise<{ result: AsrResult; cost: ProviderCost }> {
    // BLOCKED: live SARVAM_API_KEY required for real transcription; fixtures used in tests.
    if (!this.apiKey) throw new Error("SARVAM_API_KEY missing");
    const lang = opts.lang ?? "ml";
    const emit = (p: SarvamProgress): void => opts.onProgress?.(p);

    emit({ phase: "resolving", ratio: 0 });
    await this.limiter.acquire();
    const audioUrl = await this.resolveUrl(audio);

    const useJob =
      opts.mode === "job" ||
      (opts.mode !== "sync" && (opts.durationSec ?? 0) >= this.jobThresholdSec);

    const raw = useJob
      ? await this.runJob(audioUrl, lang, emit, opts.signal)
      : await this.runSync(audioUrl, lang, emit, opts.signal);

    emit({ phase: "collecting", ratio: 0.95 });
    const result = this.toAsrResult(raw);
    emit({ phase: "done", ratio: 1 });

    const seconds = raw.duration_seconds ?? opts.durationSec ?? 0;
    return { result, cost: asrCost("sarvam-saarika", seconds) };
  }

  // ---- sync path ----------------------------------------------------------

  private async runSync(
    audioUrl: string,
    lang: string,
    emit: (p: SarvamProgress) => void,
    signal?: AbortSignal,
  ): Promise<SarvamTranscriptRaw> {
    emit({ phase: "transcribing", ratio: 0.1 });
    return this.breaker.run(async () => {
      const res = await this.fetchImpl(`${this.baseUrl}/speech-to-text`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          audio_url: audioUrl,
          language_code: `${lang}-IN`,
          with_timestamps: true,
        }),
        signal,
      });
      if (!res.ok) throw new Error(`sarvam ${res.status}: ${await safeText(res)}`);
      return (await res.json()) as SarvamTranscriptRaw;
    });
  }

  // ---- batch job path (submit → poll → collect) ----------------------------

  private async runJob(
    audioUrl: string,
    lang: string,
    emit: (p: SarvamProgress) => void,
    signal?: AbortSignal,
  ): Promise<SarvamTranscriptRaw> {
    const submitted = await this.breaker.run(async () => {
      const res = await this.fetchImpl(`${this.baseUrl}/speech-to-text-job`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          audio_url: audioUrl,
          language_code: `${lang}-IN`,
          with_timestamps: true,
        }),
        signal,
      });
      if (!res.ok) throw new Error(`sarvam job submit ${res.status}: ${await safeText(res)}`);
      return (await res.json()) as SarvamJobStatusRaw;
    });

    const jobId = submitted.job_id;
    if (!jobId) throw new Error("sarvam job submit returned no job_id");
    emit({ phase: "submitted", ratio: 0.05, jobId });

    const startedAt = Date.now();
    let polls = 0;
    for (;;) {
      if (signal?.aborted) throw new Error("sarvam job aborted");
      if (Date.now() - startedAt > this.pollTimeoutMs) {
        throw new Error(`sarvam job ${jobId} timed out after ${this.pollTimeoutMs}ms`);
      }
      await this.sleep(this.pollIntervalMs);
      polls += 1;

      const status = await this.pollJob(jobId, signal);
      const state = (status.job_state ?? status.status ?? "").toLowerCase();

      if (TERMINAL_FAIL.has(state)) {
        throw new Error(`sarvam job ${jobId} ${state}: ${status.error_message ?? "no detail"}`);
      }
      if (TERMINAL_OK.has(state)) {
        const out = status.output ?? status.outputs?.[0];
        if (!out) throw new Error(`sarvam job ${jobId} completed with no output`);
        return out;
      }

      // Still running. Prefer the provider's own percentage; otherwise approach
      // 0.9 asymptotically so the bar always moves but never claims completion.
      const ratio =
        typeof status.progress === "number"
          ? clamp01(status.progress > 1 ? status.progress / 100 : status.progress) * 0.9
          : Math.min(0.9, 0.1 + polls * 0.05);
      emit({ phase: "transcribing", ratio, jobId, message: state || undefined });
    }
  }

  private async pollJob(jobId: string, signal?: AbortSignal): Promise<SarvamJobStatusRaw> {
    const res = await this.fetchImpl(`${this.baseUrl}/speech-to-text-job/${jobId}`, {
      method: "GET",
      headers: this.headers(),
      signal,
    });
    if (!res.ok) throw new Error(`sarvam job status ${res.status}: ${await safeText(res)}`);
    return (await res.json()) as SarvamJobStatusRaw;
  }

  // ---- shared -------------------------------------------------------------

  private headers(): Record<string, string> {
    return {
      "api-subscription-key": this.apiKey as string,
      "content-type": "application/json",
    };
  }

  /** Normalise either response shape into the AsrResult contract. */
  private toAsrResult(raw: SarvamTranscriptRaw): AsrResult {
    const text = raw.transcript ?? raw.text ?? "";
    const rawSegments = raw.segments ?? raw.timestamps ?? [];
    const segments = rawSegments
      .map((s) => {
        const start = s.start ?? s.start_time_seconds ?? 0;
        const end = s.end ?? s.end_time_seconds ?? start;
        return {
          startSec: Math.max(0, Math.floor(start)),
          endSec: Math.max(0, Math.ceil(end)),
          textMl: (s.text ?? s.transcript ?? "").trim(),
        };
      })
      .filter((s) => s.textMl.length > 0);

    return asrResultSchema.parse({
      rawMl: text,
      segments: segments.length ? segments : [{ startSec: 0, endSec: 0, textMl: text }],
      asrProvider: "sarvam",
    });
  }
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "<unreadable body>";
  }
}
