/**
 * Provider-agnostic AI clients (§8.1). Interfaces defined here; concrete
 * providers (sarvam, whisper, claude, embed) land in Phase 2A.
 */

export interface ProviderCost {
  readonly usd: number;
  readonly inputUnits: number;
  readonly outputUnits: number;
}

export interface AiProvider {
  readonly name: string;
}
