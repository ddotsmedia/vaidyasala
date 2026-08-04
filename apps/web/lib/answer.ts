import "server-only";
import { prisma, type Prisma } from "@vaidyasala/db";
import { ai } from "@vaidyasala/core";
import { rrfMerge, ANSWER_MIN_SCORE, type RankedRef } from "@vaidyasala/core/search";
import { searchClient } from "./search";
import { env } from "./env";

export interface RetrievedSegment {
  key: string; // TranscriptSegmentVector id
  videoId: string;
  videoSlug: string;
  videoTitleMl: string;
  startSec: number;
  textMl: string;
}

export interface Citation {
  videoId: string;
  videoSlug: string;
  startSec: number;
  label: string;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1);
}

// English function/question words + Malayalam question words — stripped before
// lexical candidate lookup so a question phrase reduces to its content terms
// ("how to control cholesterol?" → "control cholesterol").
const STOP = new Set([
  "how", "to", "what", "why", "when", "where", "which", "who", "is", "are", "can",
  "should", "do", "does", "the", "an", "of", "for", "in", "on", "and", "my", "with",
  "എങ്ങനെ", "എന്ത്", "എന്തുകൊണ്ട്", "എവിടെ", "എപ്പോൾ", "ഉണ്ടോ", "ആകുമോ", "വേണോ", "കഴിയുമോ",
]);

function contentTokens(question: string): string[] {
  return tokenize(question).filter((t) => !STOP.has(t));
}

/** Lexical candidate video ids for the question (Meili → DB fallback). */
async function candidateVideoIds(question: string): Promise<string[]> {
  const content = contentTokens(question);
  const cleaned = content.join(" ") || question;
  if (searchClient) {
    const videoHits = (q: string) =>
      searchClient!.search(q, 6).then(
        (r) => r.groups.find((g) => g.heading === "Videos")?.items.map((i) => i.id) ?? [],
      );
    const ids = new Set(await videoHits(cleaned));
    // Meili's default strategy can drop the trailing keyword; also search each
    // content token so a phrase like "control cholesterol" still finds it.
    if (ids.size < 3) {
      for (const tok of content) for (const id of await videoHits(tok)) ids.add(id);
    }
    if (ids.size) return [...ids].slice(0, 6);
  }
  // DB fallback: transcript / title match on content tokens.
  const toks = content.slice(0, 6);
  if (!toks.length) return [];
  const rows = await prisma.video.findMany({
    where: {
      status: "PUBLISHED",
      OR: toks.flatMap((t) => [
        { titleMl: { contains: t, mode: "insensitive" as const } },
        { transcript: { correctedMl: { contains: t, mode: "insensitive" as const } } },
      ]),
    },
    select: { id: true },
    take: 6,
  });
  return rows.map((r) => r.id);
}

/**
 * Retrieve the top transcript segments for a question (§14): a lexical ranking
 * (token overlap within candidate videos) fused via RRF with a pgvector cosine
 * ranking when embeddings are available. Fixture mode (no EMBED_API_KEY) uses
 * the lexical ranking alone — deterministic and offline.
 */
export async function retrieveSegments(question: string, topK = 12): Promise<RetrievedSegment[]> {
  const videoIds = await candidateVideoIds(question);

  // Lexical: segments of candidate videos ranked by query-token overlap.
  let lexical: RankedRef[] = [];
  const toks = new Set(tokenize(question));
  if (videoIds.length) {
    const segs = await prisma.transcriptSegmentVector.findMany({
      where: { videoId: { in: videoIds } },
      select: { id: true, textMl: true },
    });
    lexical = segs
      .map((s) => ({ id: s.id, overlap: tokenize(s.textMl).filter((t) => toks.has(t)).length }))
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, topK)
      .map((s, i) => ({ id: s.id, rank: i + 1 }));
  }

  // Vector: pgvector cosine top-K (only when we can embed the query).
  let vector: RankedRef[] = [];
  if (env.EMBED_API_KEY) {
    try {
      const provider = new ai.HostedEmbedProvider({ apiKey: env.EMBED_API_KEY });
      const { vectors } = await provider.embed([question]);
      const vec = `[${vectors[0]!.join(",")}]`;
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "TranscriptSegmentVector"
        ORDER BY "embedding" <=> ${vec}::vector
        LIMIT ${topK}
      `;
      vector = rows.map((r, i) => ({ id: r.id, rank: i + 1 }));
    } catch {
      // BLOCKED: embedding provider unavailable — lexical-only retrieval.
    }
  }

  const fused = rrfMerge([lexical, vector].filter((l) => l.length));
  const winners = fused.filter((f) => f.score >= ANSWER_MIN_SCORE).slice(0, 6);
  if (!winners.length) return [];

  const ids = winners.map((w) => w.id);
  const segs = await prisma.transcriptSegmentVector.findMany({
    where: { id: { in: ids } },
    select: { id: true, videoId: true, startSec: true, textMl: true },
  });
  const videos = await prisma.video.findMany({
    where: { id: { in: segs.map((s) => s.videoId) } },
    select: { id: true, slug: true, titleMl: true },
  });
  const vmap = new Map(videos.map((v) => [v.id, v]));
  const order = new Map(ids.map((id, i) => [id, i]));

  return segs
    .map((s): RetrievedSegment | null => {
      const v = vmap.get(s.videoId);
      if (!v) return null;
      return {
        key: s.id,
        videoId: s.videoId,
        videoSlug: v.slug,
        videoTitleMl: v.titleMl,
        startSec: s.startSec,
        textMl: s.textMl,
      };
    })
    .filter((x): x is RetrievedSegment => x !== null)
    .sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));
}

export interface ComposedAnswer {
  answer: string;
  citations: Citation[];
}

/**
 * Compose an answer STRICTLY from the retrieved segments (§14 retrieval-only).
 * Live: Claude composes with per-claim citations. Fixture (no ANTHROPIC_API_KEY):
 * an extractive answer stitched from the top segments — never invents content.
 */
export async function composeAnswer(
  question: string,
  segments: RetrievedSegment[],
): Promise<ComposedAnswer> {
  const citations: Citation[] = segments.map((s) => ({
    videoId: s.videoId,
    videoSlug: s.videoSlug,
    startSec: s.startSec,
    label: `${s.videoTitleMl} · ${Math.floor(s.startSec / 60)}:${String(s.startSec % 60).padStart(2, "0")}`,
  }));

  if (env.ANTHROPIC_API_KEY) {
    try {
      const llm = new ai.ClaudeLlmProvider({ apiKey: env.ANTHROPIC_API_KEY });
      const context = segments
        .map((s, i) => `[${i + 1}] (videoId=${s.videoId}, startSec=${s.startSec}) ${s.textMl}`)
        .join("\n");
      const res = await llm.complete({
        kind: "ai-answer",
        tier: "workhorse",
        system:
          "You answer Malayalam health questions using ONLY the provided transcript segments. " +
          "Never add facts that are not in the segments. Answer in Malayalam, 2-4 sentences. " +
          "If the segments do not answer the question, say so honestly.",
        user: `Question: ${question}\n\nSegments:\n${context}\n\nAnswer (Malayalam only):`,
      });
      return { answer: res.text.trim(), citations };
    } catch {
      // BLOCKED: Claude unavailable — fall through to extractive fixture answer.
    }
  }

  // Fixture: extractive answer from the top segments (deterministic, offline).
  const answer = segments
    .slice(0, 3)
    .map((s) => s.textMl.trim())
    .join(" ");
  return { answer, citations };
}

/** Nearest topic hubs for the honest no-answer path (§6.4). */
export async function nearestTopics(question: string): Promise<{ slug: string; nameMl: string }[]> {
  const toks = tokenize(question).slice(0, 5);
  const where: Prisma.TopicWhereInput = toks.length
    ? { OR: toks.map((t) => ({ nameEn: { contains: t, mode: "insensitive" as const } })) }
    : {};
  const topics = await prisma.topic.findMany({ where, select: { slug: true, nameMl: true }, take: 3 });
  if (topics.length) return topics;
  return prisma.topic.findMany({ select: { slug: true, nameMl: true }, take: 3 });
}
