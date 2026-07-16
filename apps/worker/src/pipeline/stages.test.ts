import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@vaidyasala/db";
import type { LlmProvider, LlmResult, PromptTask } from "@vaidyasala/core/ai";
import type { PipelineDeps } from "./deps";
import { correctStage } from "../jobs/correct";
import { translateStage } from "../jobs/translate";
import { chapterizeStage } from "../jobs/chapterize";
import { enrichStage } from "../jobs/enrich";
import { articleStage } from "../jobs/article";

const SEGMENTS = [
  { startSec: 0, endSec: 90, textMl: "പ്രമേഹം ഒരു അവസ്ഥയാണ്" },
  { startSec: 90, endSec: 300, textMl: "ലക്ഷണങ്ങൾ ഉണ്ട്" },
];

/** Fixture LLM: returns canned JSON per task.kind — zero real API calls. */
function fixtureLlm(): LlmProvider {
  const fixtures: Record<string, unknown> = {
    correct: { correctedMl: "പ്രമേഹം ഒരു അവസ്ഥയാണ്.", changedRatio: 0.1, flaggedForReview: false },
    translate: {
      english: "Diabetes is a condition. Symptoms exist.",
      segments: [
        { startSec: 0, textEn: "Diabetes is a condition." },
        { startSec: 90, textEn: "Symptoms exist." },
      ],
    },
    chapterize: {
      chapters: [
        { startSec: 0, titleMl: "ആമുഖം", titleEn: "Intro" },
        { startSec: 90, titleMl: "ലക്ഷണങ്ങൾ", titleEn: "Symptoms" },
      ],
    },
    enrich: {
      summaryMl: "സംഗ്രഹം",
      summaryEn: "summary",
      keyTakeaways: [{ ml: "ഒന്ന്", en: "one" }],
      faqs: [{ questionMl: "മാറുമോ?", answerMl: "അതെ", timestampSec: 90 }],
      keywords: [{ termMl: "പഞ്ചസാര", termEn: "sugar", kind: "disease" }],
      seoTitle: "t",
      seoDescription: "d",
      socialSnippets: { instagram: "i", whatsapp: "w", facebook: "f", x: "x" },
      newsletterMd: "# news",
    },
    article: {
      titleMl: "പ്രമേഹം ലേഖനം",
      bodyMl: "## തലക്കെട്ട്\nഉള്ളടക്കം",
      readingMin: 4,
      claims: [
        { text: "claim1", segmentStartSec: 0 },
        { text: "claim2", segmentStartSec: null },
      ],
    },
  };
  return {
    name: "fixture",
    complete: async (task: PromptTask): Promise<LlmResult> => ({
      text: JSON.stringify(fixtures[task.kind] ?? {}),
      cost: { usd: 0.01, inputUnits: 10, outputUnits: 20, model: "fixture-model" },
    }),
  };
}

function makeDeps(prisma: unknown): PipelineDeps {
  return {
    prisma: prisma as PrismaClient,
    storage: { enabled: false, bucket: "t", put: async () => ({ key: "" }), urlFor: () => undefined },
    asr: { name: "sarvam", transcribe: async () => { throw new Error("n/a"); } },
    llm: fixtureLlm(),
    embed: { name: "e", dimensions: 1024, embed: async () => ({ vectors: [], cost: { usd: 0, inputUnits: 0, outputUnits: 0, model: "e" } }) },
    meili: null,
    glossary: [],
    log: () => {},
  };
}

const DATA = { videoId: "v1", youtubeId: "abcdefghijk", stage: "correct" as const };

describe("correctStage", () => {
  it("chunks, corrects, and writes correctedMl with a computed changedRatio", async () => {
    const update = vi.fn();
    const prisma = {
      transcript: {
        findUnique: async () => ({ rawMl: "raw ml text", correctedMl: null, segments: SEGMENTS }),
        update,
      },
    };
    const res = await correctStage(makeDeps(prisma))(DATA);
    expect(res.costUsd).toBeGreaterThan(0);
    expect(update).toHaveBeenCalledOnce();
    const arg = update.mock.calls[0]![0] as { data: { correctedMl: string } };
    expect(arg.data.correctedMl).toContain("പ്രമേഹം");
  });

  it("skips when already corrected", async () => {
    const update = vi.fn();
    const prisma = {
      transcript: { findUnique: async () => ({ rawMl: "x", correctedMl: "done", segments: SEGMENTS }), update },
    };
    const res = await correctStage(makeDeps(prisma))(DATA);
    expect(res.costUsd).toBe(0);
    expect(update).not.toHaveBeenCalled();
  });
});

describe("translateStage", () => {
  it("merges segment translations and writes english", async () => {
    const update = vi.fn();
    const prisma = {
      transcript: { findUnique: async () => ({ english: null, segments: SEGMENTS }), update },
    };
    await translateStage(makeDeps(prisma))(DATA);
    const arg = update.mock.calls[0]![0] as { data: { english: string } };
    expect(arg.data.english).toContain("Diabetes");
  });
});

describe("chapterizeStage", () => {
  it("skips when chapters exist", async () => {
    const createMany = vi.fn();
    const prisma = { chapter: { count: async () => 3, createMany } };
    await chapterizeStage(makeDeps(prisma))(DATA);
    expect(createMany).not.toHaveBeenCalled();
  });
  it("creates chapters from the transcript when none exist", async () => {
    const createMany = vi.fn(async () => ({ count: 2 }));
    const prisma = {
      chapter: { count: async () => 0, createMany },
      transcript: { findUnique: async () => ({ segments: SEGMENTS }) },
    };
    await chapterizeStage(makeDeps(prisma))(DATA);
    expect(createMany).toHaveBeenCalledOnce();
  });
});

describe("enrichStage", () => {
  it("creates enrichment, faqs and keywords", async () => {
    const create = vi.fn(async () => ({}));
    const faqCreate = vi.fn(async () => ({}));
    const kwCreate = vi.fn(async () => ({}));
    const prisma = {
      enrichment: { findUnique: async () => null, create },
      transcript: { findUnique: async () => ({ correctedMl: "corrected", rawMl: "raw" }) },
      faq: { deleteMany: async () => ({}), createMany: faqCreate },
      keyword: { deleteMany: async () => ({}), createMany: kwCreate },
    };
    await enrichStage(makeDeps(prisma))(DATA);
    expect(create).toHaveBeenCalledOnce();
    expect(faqCreate).toHaveBeenCalledOnce();
    expect(kwCreate).toHaveBeenCalledOnce();
  });
});

describe("articleStage", () => {
  it("drafts an article from verified claims", async () => {
    const create = vi.fn();
    const prisma = {
      article: { findUnique: async () => null, create },
      transcript: { findUnique: async () => ({ segments: SEGMENTS }) },
    };
    await articleStage(makeDeps(prisma))(DATA);
    const arg = create.mock.calls[0]![0] as { data: { slug: string; readingMin: number } };
    expect(arg.data.slug).toContain("abcdefghijk");
    expect(arg.data.readingMin).toBe(4);
  });
});
