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

export interface AsrProvider {
  readonly name: "sarvam" | "whisper" | "youtube-captions";
  transcribe(audio: R2Ref, lang: "ml"): Promise<{ result: AsrResult; cost: ProviderCost }>;
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
