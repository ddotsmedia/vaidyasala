import type { AsrProvider, ProviderCost, R2Ref } from "../types";
import { asrResultSchema, type AsrResult } from "../../validation/ai";
import { asrCost } from "../cost";
import { CircuitBreaker } from "../circuit-breaker";
import { TokenBucket } from "../rate-limit";
import type { AudioUrlResolver } from "./sarvam";

export interface WhisperConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  resolveUrl: AudioUrlResolver;
  fetchImpl?: typeof fetch;
  rateLimiter?: TokenBucket;
  breaker?: CircuitBreaker;
}

/**
 * Whisper large-v3 API (fallback ASR, §8.1) via an OpenAI-compatible
 * transcription endpoint. Verbose JSON gives segment timestamps.
 */
export class WhisperAsrProvider implements AsrProvider {
  readonly name = "whisper" as const;
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly resolveUrl: AudioUrlResolver;
  private readonly fetchImpl: typeof fetch;
  private readonly limiter: TokenBucket;
  private readonly breaker: CircuitBreaker;

  constructor(cfg: WhisperConfig) {
    this.apiKey = cfg.apiKey ?? process.env.WHISPER_API_KEY;
    this.baseUrl = cfg.baseUrl ?? "https://api.openai.com/v1";
    this.model = cfg.model ?? "whisper-1";
    this.resolveUrl = cfg.resolveUrl;
    this.fetchImpl = cfg.fetchImpl ?? fetch;
    this.limiter = cfg.rateLimiter ?? new TokenBucket(4, 2);
    this.breaker = cfg.breaker ?? new CircuitBreaker();
  }

  async transcribe(audio: R2Ref, lang: "ml"): Promise<{ result: AsrResult; cost: ProviderCost }> {
    // BLOCKED: live WHISPER_API_KEY required for real transcription; fixtures used in tests.
    if (!this.apiKey) throw new Error("WHISPER_API_KEY missing");
    await this.limiter.acquire();
    const audioUrl = await this.resolveUrl(audio);

    const raw = await this.breaker.run(async () => {
      const res = await this.fetchImpl(`${this.baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: { authorization: `Bearer ${this.apiKey!}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          language: lang,
          response_format: "verbose_json",
          url: audioUrl,
        }),
      });
      if (!res.ok) throw new Error(`whisper ${res.status}`);
      return (await res.json()) as {
        text: string;
        duration?: number;
        segments?: { start: number; end: number; text: string }[];
      };
    });

    const segments = (raw.segments ?? []).map((s) => ({
      startSec: Math.floor(s.start),
      endSec: Math.ceil(s.end),
      textMl: s.text.trim(),
    }));
    const result = asrResultSchema.parse({
      rawMl: raw.text,
      segments: segments.length ? segments : [{ startSec: 0, endSec: 0, textMl: raw.text }],
      asrProvider: "whisper",
    });
    return { result, cost: asrCost(this.model, raw.duration ?? 0) };
  }
}
