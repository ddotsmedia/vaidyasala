/**
 * Provider-agnostic AI clients (§8.1). Interfaces + implementations
 * (sarvam/whisper/claude/embed) with shared rate-limiter, circuit breaker,
 * cost accounting, and Zod-parse-with-repair. Prompt templates live in ./prompts.
 */
export type {
  AsrProvider,
  LlmProvider,
  EmbedProvider,
  PromptTask,
  LlmResult,
  ProviderCost,
  R2Ref,
} from "./types";

export { llmCost, asrCost, embedCost, MODEL_PRICING } from "./cost";
export { TokenBucket } from "./rate-limit";
export { CircuitBreaker, type BreakerState } from "./circuit-breaker";
export { completeJson, extractJson, type ParsedResult } from "./json";

export { ClaudeLlmProvider, type ClaudeConfig, type AnthropicLike } from "./providers/claude";
export { SarvamAsrProvider, type SarvamConfig, type AudioUrlResolver } from "./providers/sarvam";
export { WhisperAsrProvider, type WhisperConfig } from "./providers/whisper";
export { HostedEmbedProvider, type EmbedConfig } from "./providers/embed";

export * as prompts from "./prompts";
