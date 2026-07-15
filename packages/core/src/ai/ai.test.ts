import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { TokenBucket } from "./rate-limit";
import { CircuitBreaker } from "./circuit-breaker";
import { completeJson, extractJson } from "./json";
import { ClaudeLlmProvider, type AnthropicLike } from "./providers/claude";
import { correctMlPrompt, enrichPrompt } from "./prompts";
import { enrichmentResultSchema } from "../validation/ai";
import type { LlmProvider, LlmResult, PromptTask } from "./types";

/** A fake LLM that returns scripted responses — zero real API calls. */
function fakeLlm(responses: string[]): LlmProvider {
  let i = 0;
  return {
    name: "fake",
    complete: async (): Promise<LlmResult> => {
      const text = responses[Math.min(i, responses.length - 1)] ?? "";
      i++;
      return { text, cost: { usd: 0.001, inputUnits: 10, outputUnits: 20, model: "fake" } };
    },
  };
}

describe("extractJson", () => {
  it("strips code fences", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("ignores trailing prose after the object", () => {
    expect(extractJson('{"a":1} thanks!')).toBe('{"a":1}');
  });
  it("handles braces inside strings", () => {
    expect(extractJson('prefix {"a":"}"} suffix')).toBe('{"a":"}"}');
  });
});

describe("completeJson", () => {
  const schema = z.object({ correctedMl: z.string(), changedRatio: z.number(), flaggedForReview: z.boolean() });

  it("parses valid JSON on first attempt", async () => {
    const llm = fakeLlm(['{"correctedMl":"ok","changedRatio":0.1,"flaggedForReview":false}']);
    const { data, attempts } = await completeJson(llm, correctMlPrompt("raw"), schema);
    expect(data.correctedMl).toBe("ok");
    expect(attempts).toBe(1);
  });

  it("repairs after an invalid first response and accumulates cost", async () => {
    const llm = fakeLlm([
      "not json at all",
      '{"correctedMl":"fixed","changedRatio":0.2,"flaggedForReview":false}',
    ]);
    const { data, attempts, cost } = await completeJson(llm, correctMlPrompt("raw"), schema);
    expect(data.correctedMl).toBe("fixed");
    expect(attempts).toBe(2);
    expect(cost.usd).toBeCloseTo(0.002, 6);
  });

  it("throws after exhausting repairs", async () => {
    const llm = fakeLlm(["garbage"]);
    await expect(completeJson(llm, correctMlPrompt("raw"), schema, 2)).rejects.toThrow(/after 3 attempts/);
  });
});

describe("prompts", () => {
  it("bakes hallucination rules and glossary into enrich prompt", () => {
    const task: PromptTask = enrichPrompt("ട്രാൻസ്ക്രിപ്റ്റ്");
    expect(task.kind).toBe("enrich");
    expect(task.tier).toBe("workhorse");
    expect(task.system).toContain("TRANSFORMING");
    expect(task.system).toContain("പ്രമേഹം");
  });

  it("produces enrichment JSON that satisfies the schema via the fake chain", async () => {
    const payload = {
      summaryMl: "സംഗ്രഹം",
      summaryEn: "summary",
      keyTakeaways: [{ ml: "a", en: "a" }],
      faqs: [],
      keywords: [],
      seoTitle: "t",
      seoDescription: "d",
      socialSnippets: { instagram: "i", whatsapp: "w", facebook: "f", x: "x" },
      newsletterMd: "# nl",
    };
    const llm = fakeLlm([JSON.stringify(payload)]);
    const { data } = await completeJson(llm, enrichPrompt("t"), enrichmentResultSchema);
    expect(data.summaryEn).toBe("summary");
  });
});

describe("TokenBucket", () => {
  it("acquires immediately while tokens remain, then waits", async () => {
    const sleep = vi.fn(async () => {});
    let t = 0;
    const bucket = new TokenBucket(2, 1, () => t, sleep);
    await bucket.acquire();
    await bucket.acquire();
    expect(sleep).not.toHaveBeenCalled();
    // Third acquire has no tokens → must wait; advance clock so the retry succeeds.
    const p = bucket.acquire();
    t = 2000;
    await p;
    expect(sleep).toHaveBeenCalled();
  });
});

describe("CircuitBreaker", () => {
  it("opens after threshold failures and fails fast", async () => {
    let now = 0;
    const breaker = new CircuitBreaker(2, 1000, () => now);
    const boom = () => Promise.reject(new Error("boom"));
    await expect(breaker.run(boom)).rejects.toThrow("boom");
    await expect(breaker.run(boom)).rejects.toThrow("boom");
    await expect(breaker.run(boom)).rejects.toThrow("circuit-open");
    // After cooldown it half-opens and allows a trial.
    now = 1500;
    await expect(breaker.run(() => Promise.resolve("ok"))).resolves.toBe("ok");
  });
});

describe("ClaudeLlmProvider", () => {
  it("selects the cheap model for cheap-tier tasks and computes cost", async () => {
    const create = vi.fn(async () => ({
      content: [{ type: "text", text: '{"chapters":[]}' }],
      usage: { input_tokens: 1000, output_tokens: 500 },
    }));
    const client = { messages: { create } } as unknown as AnthropicLike;
    const provider = new ClaudeLlmProvider({ client });

    const res = await provider.complete({ kind: "chapterize", tier: "cheap", system: "s", user: "u" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-haiku-4-5" }));
    expect(res.text).toContain("chapters");
    // Haiku: $1/1M in, $5/1M out → 0.001 + 0.0025 = 0.0035
    expect(res.cost.usd).toBeCloseTo(0.0035, 6);
  });

  it("selects the workhorse model by default", async () => {
    const create = vi.fn(async () => ({
      content: [{ type: "text", text: "ok" }],
      usage: { input_tokens: 0, output_tokens: 0 },
    }));
    const client = { messages: { create } } as unknown as AnthropicLike;
    const provider = new ClaudeLlmProvider({ client });
    await provider.complete({ kind: "enrich", system: "s", user: "u" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-sonnet-5" }));
  });
});
