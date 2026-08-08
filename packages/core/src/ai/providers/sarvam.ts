import type { AsrProvider, ProviderCost, R2Ref } from "../types";
import type { AsrResult } from "../../validation/ai";
import type { TokenBucket } from "../rate-limit";
import type { CircuitBreaker } from "../circuit-breaker";
import {
  SarvamClient,
  type AudioUrlResolver,
  type ProgressListener,
} from "../../sarvam/client";

export type { AudioUrlResolver };

export interface SarvamConfig {
  apiKey?: string;
  baseUrl?: string;
  resolveUrl: AudioUrlResolver;
  fetchImpl?: typeof fetch;
  rateLimiter?: TokenBucket;
  breaker?: CircuitBreaker;
  /** Forwarded to every transcribe() call — lets the worker log ASR progress. */
  onProgress?: ProgressListener;
}

/**
 * Sarvam Saarika ASR (primary Malayalam ASR, §8.1).
 *
 * Adapter only: the request/response mapping, the sync-vs-batch decision and the
 * progress reporting all live in `sarvam/client.ts`. This class exists so the
 * pipeline keeps talking to the narrow `AsrProvider` interface.
 */
export class SarvamAsrProvider implements AsrProvider {
  readonly name = "sarvam" as const;
  private readonly client: SarvamClient;
  private readonly onProgress: ProgressListener | undefined;

  constructor(cfg: SarvamConfig) {
    this.client = new SarvamClient({
      apiKey: cfg.apiKey,
      baseUrl: cfg.baseUrl,
      resolveUrl: cfg.resolveUrl,
      fetchImpl: cfg.fetchImpl,
      rateLimiter: cfg.rateLimiter,
      breaker: cfg.breaker,
    });
    this.onProgress = cfg.onProgress;
  }

  async transcribe(
    audio: R2Ref,
    lang: "ml",
    onProgress?: ProgressListener,
  ): Promise<{ result: AsrResult; cost: ProviderCost }> {
    const listener = onProgress ?? this.onProgress;
    return this.client.transcribe(audio, { lang, onProgress: listener });
  }
}
