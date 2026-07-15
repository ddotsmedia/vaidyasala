import type { ProviderCost } from "./types";

/**
 * Per-model pricing (USD per 1M tokens). Workhorse = Claude Sonnet, cheap tasks
 * = Claude Haiku (§8.1). ASR/embedding prices are per unit where noted.
 */
export const MODEL_PRICING: Record<string, { inPerM: number; outPerM: number }> = {
  "claude-sonnet-5": { inPerM: 3, outPerM: 15 },
  "claude-haiku-4-5": { inPerM: 1, outPerM: 5 },
};

export function llmCost(model: string, inputTokens: number, outputTokens: number): ProviderCost {
  const p = MODEL_PRICING[model] ?? { inPerM: 0, outPerM: 0 };
  const usd = (inputTokens / 1_000_000) * p.inPerM + (outputTokens / 1_000_000) * p.outPerM;
  return { usd: Number(usd.toFixed(6)), inputUnits: inputTokens, outputUnits: outputTokens, model };
}

/** Sarvam Saarika ASR ~ $0.006/min; whisper API ~ $0.006/min. */
export function asrCost(model: string, seconds: number, usdPerMinute = 0.006): ProviderCost {
  const usd = (seconds / 60) * usdPerMinute;
  return { usd: Number(usd.toFixed(6)), inputUnits: seconds, outputUnits: 0, model };
}

/** Embeddings priced per 1M input tokens (hosted multilingual-e5-class). */
export function embedCost(model: string, tokens: number, usdPerM = 0.02): ProviderCost {
  const usd = (tokens / 1_000_000) * usdPerM;
  return { usd: Number(usd.toFixed(6)), inputUnits: tokens, outputUnits: 0, model };
}
