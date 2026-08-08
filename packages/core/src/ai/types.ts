/** Provider abstraction (§8.1). Providers are config, not code. */
import type { AsrResult } from "../validation/ai";

/** Pointer to an object in R2 (or local MinIO fallback). */
export interface R2Ref {
  bucket: string;
  key: string;
  contentType?: string;
}

/** Per-call cost accounting, mirrored to Job.costUsd (§8.1). */
export interface ProviderCost {
  usd: number;
  inputUnits: number;
  outputUnits: number;
  model: string;
}

/** Progress tick from a long-running transcription. `ratio` is 0..1. */
export interface AsrProgress {
  phase: string;
  ratio: number;
  jobId?: string;
  message?: string;
}

export interface AsrProvider {
  readonly name: "sarvam" | "whisper" | "youtube-captions";
  /**
   * `onProgress` is optional and additive — providers that do not report progress
   * simply declare two parameters and still satisfy this interface.
   */
  transcribe(
    audio: R2Ref,
    lang: "ml",
    onProgress?: (p: AsrProgress) => void,
  ): Promise<{ result: AsrResult; cost: ProviderCost }>;
}

/** A named LLM task with a rendered prompt (§8.1). */
export interface PromptTask {
  /** Job kind this prompt serves — used for cost attribution + logging. */
  kind: string;
  system: string;
  user: string;
  /** Model tier: "workhorse" (Sonnet) or "cheap" (Haiku). */
  tier?: "workhorse" | "cheap";
  maxTokens?: number;
}

export interface LlmResult {
  text: string;
  cost: ProviderCost;
}

export interface LlmProvider {
  readonly name: string;
  complete(task: PromptTask): Promise<LlmResult>;
}

export interface EmbedProvider {
  readonly name: string;
  readonly dimensions: 1024;
  embed(texts: string[]): Promise<{ vectors: number[][]; cost: ProviderCost }>;
}
