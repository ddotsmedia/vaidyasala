import type { EmbedProvider, ProviderCost } from "../types";
import { embedCost } from "../cost";
import { CircuitBreaker } from "../circuit-breaker";
import { TokenBucket } from "../rate-limit";

export interface EmbedConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  rateLimiter?: TokenBucket;
  breaker?: CircuitBreaker;
}

/**
 * Hosted multilingual-e5-large-class embedding provider, 1024-dim (§8.1). Uses
 * an OpenAI-compatible /embeddings endpoint over fetch.
 */
export class HostedEmbedProvider implements EmbedProvider {
  readonly name = "embed";
  readonly dimensions = 1024 as const;
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;
  private readonly limiter: TokenBucket;
  private readonly breaker: CircuitBreaker;

  constructor(cfg: EmbedConfig = {}) {
    this.apiKey = cfg.apiKey ?? process.env.EMBED_API_KEY;
    this.baseUrl = cfg.baseUrl ?? "https://api.openai.com/v1";
    this.model = cfg.model ?? "multilingual-e5-large";
    this.fetchImpl = cfg.fetchImpl ?? fetch;
    this.limiter = cfg.rateLimiter ?? new TokenBucket(20, 10);
    this.breaker = cfg.breaker ?? new CircuitBreaker();
  }

  async embed(texts: string[]): Promise<{ vectors: number[][]; cost: ProviderCost }> {
    // BLOCKED: live EMBED_API_KEY required; tests inject fetchImpl.
    if (!this.apiKey) throw new Error("EMBED_API_KEY missing");
    if (texts.length === 0) return { vectors: [], cost: embedCost(this.model, 0) };
    await this.limiter.acquire();

    const raw = await this.breaker.run(async () => {
      const res = await this.fetchImpl(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: { authorization: `Bearer ${this.apiKey!}`, "content-type": "application/json" },
        body: JSON.stringify({ model: this.model, input: texts }),
      });
      if (!res.ok) throw new Error(`embed ${res.status}`);
      return (await res.json()) as {
        data: { embedding: number[] }[];
        usage?: { total_tokens?: number };
      };
    });

    const vectors = raw.data.map((d) => d.embedding);
    for (const v of vectors) {
      if (v.length !== this.dimensions) {
        throw new Error(`embed: expected ${this.dimensions}-dim vector, got ${v.length}`);
      }
    }
    return { vectors, cost: embedCost(this.model, raw.usage?.total_tokens ?? 0) };
  }
}
