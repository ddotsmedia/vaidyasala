import type { AsrProvider, ProviderCost, R2Ref } from "../types";
import { asrResultSchema, type AsrResult } from "../../validation/ai";
import { asrCost } from "../cost";
import { TokenBucket } from "../rate-limit";
import { CircuitBreaker } from "../circuit-breaker";

/** Resolves an R2Ref to a fetchable URL (presigned) — injected so tests stay offline. */
export type AudioUrlResolver = (ref: R2Ref) => Promise<string>;

export interface SarvamConfig {
  apiKey?: string;
  baseUrl?: string;
  resolveUrl: AudioUrlResolver;
  fetchImpl?: typeof fetch;
  rateLimiter?: TokenBucket;
  breaker?: CircuitBreaker;
}

/**
 * Sarvam Saarika ASR (primary Malayalam ASR, §8.1). Talks to the REST API over
 * fetch; the concrete request/response mapping is finalized when a key exists.
 */
export class SarvamAsrProvider implements AsrProvider {
  readonly name = "sarvam" as const;
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly resolveUrl: AudioUrlResolver;
  private readonly fetchImpl: typeof fetch;
  private readonly limiter: TokenBucket;
  private readonly breaker: CircuitBreaker;

  constructor(cfg: SarvamConfig) {
    this.apiKey = cfg.apiKey ?? process.env.SARVAM_API_KEY;
    this.baseUrl = cfg.baseUrl ?? "https://api.sarvam.ai";
    this.resolveUrl = cfg.resolveUrl;
    this.fetchImpl = cfg.fetchImpl ?? fetch;
    this.limiter = cfg.rateLimiter ?? new TokenBucket(4, 2);
    this.breaker = cfg.breaker ?? new CircuitBreaker();
  }

  async transcribe(audio: R2Ref, lang: "ml"): Promise<{ result: AsrResult; cost: ProviderCost }> {
    // BLOCKED: live SARVAM_API_KEY required for real transcription; fixtures used in tests.
    if (!this.apiKey) throw new Error("SARVAM_API_KEY missing");
    await this.limiter.acquire();
    const audioUrl = await this.resolveUrl(audio);

    const raw = await this.breaker.run(async () => {
      const res = await this.fetchImpl(`${this.baseUrl}/speech-to-text`, {
        method: "POST",
        headers: { "api-subscription-key": this.apiKey!, "content-type": "application/json" },
        body: JSON.stringify({ audio_url: audioUrl, language_code: `${lang}-IN`, with_timestamps: true }),
      });
      if (!res.ok) throw new Error(`sarvam ${res.status}`);
      return (await res.json()) as {
        transcript: string;
        segments?: { start: number; end: number; text: string }[];
        duration_seconds?: number;
      };
    });

    const segments = (raw.segments ?? []).map((s) => ({
      startSec: Math.floor(s.start),
      endSec: Math.ceil(s.end),
      textMl: s.text,
    }));
    const result = asrResultSchema.parse({
      rawMl: raw.transcript,
      segments: segments.length ? segments : [{ startSec: 0, endSec: 0, textMl: raw.transcript }],
      asrProvider: "sarvam",
    });
    return { result, cost: asrCost("sarvam-saarika", raw.duration_seconds ?? 0) };
  }
}
