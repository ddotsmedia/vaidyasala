import { describe, expect, it } from "vitest";
import { parseYouTubeId, idempotencyKey, ingestInputSchema, PIPELINE_STAGES } from "./index";

describe("parseYouTubeId", () => {
  it("accepts a bare 11-char id", () => {
    expect(parseYouTubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("parses watch URLs", () => {
    expect(parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5s")).toBe("dQw4w9WgXcQ");
  });
  it("parses youtu.be, shorts and embed", () => {
    expect(parseYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("https://youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("rejects garbage", () => {
    expect(parseYouTubeId("https://example.com/x")).toBeNull();
    expect(parseYouTubeId("not a url")).toBeNull();
  });
});

describe("ingestInputSchema", () => {
  it("normalizes a url to youtubeId", () => {
    const r = ingestInputSchema.parse({ url: "https://youtu.be/dQw4w9WgXcQ" });
    expect(r).toEqual({ youtubeId: "dQw4w9WgXcQ", source: "manual" });
  });
  it("accepts a bare id and a source", () => {
    const r = ingestInputSchema.parse({ youtubeId: "dQw4w9WgXcQ", source: "websub" });
    expect(r.source).toBe("websub");
  });
  it("rejects missing input", () => {
    expect(ingestInputSchema.safeParse({}).success).toBe(false);
  });
});

describe("idempotencyKey", () => {
  it("formats {kind}:{videoId}:{hash}", () => {
    expect(idempotencyKey("ingest", "v1", "abc123")).toBe("ingest:v1:abc123");
  });
});

describe("PIPELINE_STAGES", () => {
  it("is the §8.2 order, asr first and quality-gate last", () => {
    expect(PIPELINE_STAGES[0]).toBe("asr");
    expect(PIPELINE_STAGES.at(-1)).toBe("quality-gate");
    expect(PIPELINE_STAGES).toHaveLength(10);
  });
});
