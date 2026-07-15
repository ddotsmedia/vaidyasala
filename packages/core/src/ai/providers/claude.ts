import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider, LlmResult, PromptTask } from "../types";
import { llmCost } from "../cost";
import { TokenBucket } from "../rate-limit";
import { CircuitBreaker } from "../circuit-breaker";

/** Minimal surface we depend on — lets tests inject a fake Anthropic client. */
export interface AnthropicLike {
  messages: {
    create(body: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
}

export interface ClaudeConfig {
  client?: AnthropicLike;
  apiKey?: string;
  /** §8.1: Sonnet workhorse, Haiku for cheap tasks. */
  workhorseModel?: string;
  cheapModel?: string;
  rateLimiter?: TokenBucket;
  breaker?: CircuitBreaker;
}

export class ClaudeLlmProvider implements LlmProvider {
  readonly name = "claude";
  private readonly client: AnthropicLike;
  private readonly workhorse: string;
  private readonly cheap: string;
  private readonly limiter: TokenBucket;
  private readonly breaker: CircuitBreaker;

  constructor(cfg: ClaudeConfig = {}) {
    this.client =
      cfg.client ??
      // BLOCKED: needs ANTHROPIC_API_KEY at runtime; tests inject `client`.
      (new Anthropic({ apiKey: cfg.apiKey ?? process.env.ANTHROPIC_API_KEY }) as AnthropicLike);
    this.workhorse = cfg.workhorseModel ?? "claude-sonnet-5";
    this.cheap = cfg.cheapModel ?? "claude-haiku-4-5";
    this.limiter = cfg.rateLimiter ?? new TokenBucket(10, 5);
    this.breaker = cfg.breaker ?? new CircuitBreaker();
  }

  async complete(task: PromptTask): Promise<LlmResult> {
    const model = task.tier === "cheap" ? this.cheap : this.workhorse;
    await this.limiter.acquire();

    const message = await this.breaker.run(() =>
      this.client.messages.create({
        model,
        max_tokens: task.maxTokens ?? 16_000,
        system: task.system,
        messages: [{ role: "user", content: task.user }],
      }),
    );

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const cost = llmCost(model, message.usage.input_tokens, message.usage.output_tokens);
    return { text, cost };
  }
}
