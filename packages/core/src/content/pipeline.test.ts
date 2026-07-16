import { describe, expect, it } from "vitest";
import { chunkText, changedRatio, relatedScore } from "./index";

describe("chunkText", () => {
  it("returns a single chunk under the limit", () => {
    expect(chunkText("short text")).toEqual(["short text"]);
    expect(chunkText("")).toEqual([]);
  });
  it("splits long text into overlapping chunks", () => {
    const text = "word ".repeat(6000).trim(); // ~30k chars
    const chunks = chunkText(text, 12_000, 500);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 12_000)).toBe(true);
  });
});

describe("changedRatio", () => {
  it("is 0 for identical strings", () => {
    expect(changedRatio("a b c", "a b c")).toBe(0);
  });
  it("is 1 when fully different", () => {
    expect(changedRatio("a b c", "x y z")).toBe(1);
  });
  it("is partial for partial changes", () => {
    expect(changedRatio("a b c d", "a b x d")).toBeCloseTo(0.25, 5);
  });
});

describe("relatedScore", () => {
  it("weights embedding 0.6, co-topic 0.25, co-watch 0.15", () => {
    expect(relatedScore({ embedding: 1, coTopic: 1, coWatch: 1 })).toBe(1);
    expect(relatedScore({ embedding: 1, coTopic: 0, coWatch: 0 })).toBe(0.6);
    expect(relatedScore({ embedding: 0, coTopic: 1, coWatch: 0 })).toBe(0.25);
  });
  it("clamps out-of-range inputs", () => {
    expect(relatedScore({ embedding: 2, coTopic: -1, coWatch: 0 })).toBe(0.6);
  });
});
