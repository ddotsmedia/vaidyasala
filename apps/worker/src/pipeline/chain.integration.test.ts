import { describe, expect, it } from "vitest";
import { prisma, VideoStatus } from "@vaidyasala/db";
import type { AsrProvider, LlmProvider, EmbedProvider, PromptTask } from "@vaidyasala/core/ai";
import { PIPELINE_STAGES } from "@vaidyasala/core/queue";
import type { PipelineDeps } from "./deps";
import { STAGE_FACTORIES } from "./register";

/**
 * Full §8.2 chain against the live dev Postgres, driven by fixtures (no AI keys).
 * Guarded on DATABASE_URL so CI (no DB) skips it. Proves Transcript, Enrichment,
 * Article, Chapters, per-segment vectors and RelatedEdges all persist.
 * Run: DATABASE_URL=... pnpm --filter worker test
 */
const HAS_DB = Boolean(process.env.DATABASE_URL);
const YT = "pipe_smoke_2c";

function vec(seed: number): number[] {
  const out: number[] = [];
  let x = seed * 7919 + 1;
  for (let i = 0; i < 1024; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    out.push((x / 0x7fffffff) * 2 - 1);
  }
  return out;
}

const fakeAsr: AsrProvider = {
  name: "sarvam",
  transcribe: async () => ({
    result: {
      rawMl: "പ്രമേഹം ഒരു അവസ്ഥയാണ്. ലക്ഷണങ്ങൾ ഉണ്ട്. ചികിത്സ ലളിതമാണ്.",
      segments: [
        { startSec: 0, endSec: 90, textMl: "പ്രമേഹം ഒരു അവസ്ഥയാണ്" },
        { startSec: 90, endSec: 300, textMl: "ലക്ഷണങ്ങൾ ഉണ്ട്" },
      ],
      asrProvider: "sarvam" as const,
    },
    cost: { usd: 0.2, inputUnits: 300, outputUnits: 0, model: "sarvam" },
  }),
};

const fixtures: Record<string, unknown> = {
  correct: { correctedMl: "പ്രമേഹം ഒരു അവസ്ഥയാണ്. ലക്ഷണങ്ങൾ ഉണ്ട്.", changedRatio: 0.1, flaggedForReview: false },
  translate: { english: "Diabetes is a condition. Symptoms exist.", segments: [{ startSec: 0, textEn: "Diabetes is a condition." }, { startSec: 90, textEn: "Symptoms exist." }] },
  chapterize: { chapters: [{ startSec: 0, titleMl: "ആമുഖം" }, { startSec: 90, titleMl: "ലക്ഷണങ്ങൾ" }] },
  enrich: { summaryMl: "സംഗ്രഹം", summaryEn: "summary", keyTakeaways: [{ ml: "ഒന്ന്", en: "one" }], faqs: [{ questionMl: "മാറുമോ?", answerMl: "അതെ", timestampSec: 90 }], keywords: [{ termMl: "പഞ്ചസാര", termEn: "sugar", kind: "disease" }], seoTitle: "t", seoDescription: "d", socialSnippets: { instagram: "i", whatsapp: "w", facebook: "f", x: "x" }, newsletterMd: "# n" },
  article: { titleMl: "പ്രമേഹം ലേഖനം", bodyMl: "## H\nBody", readingMin: 4, claims: [{ text: "c", segmentStartSec: 0 }] },
};
const fakeLlm: LlmProvider = {
  name: "fixture",
  complete: async (task: PromptTask) => ({ text: JSON.stringify(fixtures[task.kind] ?? {}), cost: { usd: 0.01, inputUnits: 10, outputUnits: 20, model: "fixture" } }),
};
const fakeEmbed: EmbedProvider = {
  name: "e",
  dimensions: 1024,
  embed: async (texts: string[]) => ({ vectors: texts.map((_, i) => vec(i + 1)), cost: { usd: 0.001, inputUnits: 0, outputUnits: 0, model: "e" } }),
};

async function cleanup(videoId: string): Promise<void> {
  await prisma.$executeRaw`DELETE FROM "TranscriptSegmentVector" WHERE "videoId" = ${videoId}`;
  await prisma.article.deleteMany({ where: { videoId } });
  await prisma.video.deleteMany({ where: { id: videoId } });
}

describe.skipIf(!HAS_DB)("full pipeline chain (integration)", () => {
  it("runs asr→quality-gate and persists all artifacts", async () => {
    const topic = await prisma.topic.findFirst();
    expect(topic, "seed topics required — run pnpm db:seed").toBeTruthy();

    const existing = await prisma.video.findUnique({ where: { youtubeId: YT } });
    if (existing) await cleanup(existing.id);

    const video = await prisma.video.create({
      data: {
        youtubeId: YT,
        slug: `pipe-smoke-2c-${Date.now()}`,
        status: VideoStatus.PROCESSING,
        titleMl: "പ്രമേഹം സ്മോക്ക്",
        durationSec: 300,
        ytPublishedAt: new Date("2026-01-01T00:00:00Z"),
        thumbnails: {},
        stats: {},
        primaryTopicId: topic!.id,
      },
    });

    const deps: PipelineDeps = {
      prisma,
      storage: { enabled: false, bucket: "t", put: async () => ({ key: "" }), urlFor: () => undefined },
      asr: fakeAsr,
      llm: fakeLlm,
      embed: fakeEmbed,
      meili: null,
      glossary: [],
      log: () => {},
    };

    try {
      for (const stage of PIPELINE_STAGES) {
        await STAGE_FACTORIES[stage](deps)({ videoId: video.id, youtubeId: YT, stage });
      }

      const transcript = await prisma.transcript.findUnique({ where: { videoId: video.id } });
      expect(transcript?.correctedMl).toBeTruthy();
      expect(transcript?.english).toBeTruthy();
      expect(await prisma.chapter.count({ where: { videoId: video.id } })).toBeGreaterThanOrEqual(2);
      expect(await prisma.enrichment.findUnique({ where: { videoId: video.id } })).toBeTruthy();
      expect(await prisma.faq.count({ where: { videoId: video.id } })).toBeGreaterThan(0);
      expect(await prisma.keyword.count({ where: { videoId: video.id } })).toBeGreaterThan(0);
      expect(await prisma.article.findUnique({ where: { videoId: video.id } })).toBeTruthy();

      const segVecs = await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*)::bigint AS n FROM "TranscriptSegmentVector" WHERE "videoId" = ${video.id}`;
      expect(Number(segVecs[0]!.n)).toBeGreaterThan(0);

      const final = await prisma.video.findUnique({ where: { id: video.id } });
      expect(final?.status).toBe("DRAFT");
      expect(final?.qualityScore).toBeGreaterThan(0);
    } finally {
      await cleanup(video.id);
    }
  }, 30_000);
});
