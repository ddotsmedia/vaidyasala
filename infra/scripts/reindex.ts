/**
 * Full Meilisearch rebuild from Postgres (§14: "search index is cattle, not a
 * pet"). Applies index settings, clears every index, re-adds all published
 * videos/articles/topics/faqs, and syncs approved synonyms. Idempotent.
 *
 *   MEILI_URL=… MEILI_MASTER_KEY=… DATABASE_URL=… pnpm search:reindex
 */
import { prisma } from "@vaidyasala/db";
import { buildVideoSearchDoc, buildArticleDoc, buildTopicDoc, buildFaqDoc } from "@vaidyasala/core/search";
import { SearchClient } from "@vaidyasala/core/search/client";

async function main(): Promise<void> {
  const search = SearchClient.fromEnv(process.env as Record<string, string | undefined>);
  if (!search) {
    console.error("[reindex] MEILI_MASTER_KEY absent — nothing to do (BLOCKED)");
    process.exit(0);
  }

  console.log("[reindex] ensuring indexes + settings…");
  await search.ensureIndexes();
  await search.clearAll();

  // Videos (published) with all searchable relations.
  const videos = await prisma.video.findMany({
    where: { status: "PUBLISHED" },
    include: {
      primaryTopic: { select: { slug: true, nameMl: true, nameEn: true } },
      enrichment: { select: { summaryMl: true, summaryEn: true } },
      transcript: { select: { correctedMl: true } },
      keywords: { select: { termMl: true, termEn: true } },
      chapters: { select: { titleMl: true, titleEn: true } },
      faqs: { select: { questionMl: true } },
    },
  });
  await search.upsertVideos(
    videos.map((v) =>
      buildVideoSearchDoc({
        id: v.id,
        slug: v.slug,
        titleMl: v.titleMl,
        titleEn: v.titleEn,
        status: v.status,
        durationSec: v.durationSec,
        publishedAt: v.publishedAt,
        viewCount:
          typeof (v.stats as { views?: unknown } | null)?.views === "number"
            ? ((v.stats as { views: number }).views)
            : null,
        primaryTopic: v.primaryTopic,
        summaryMl: v.enrichment?.summaryMl,
        summaryEn: v.enrichment?.summaryEn,
        keywords: v.keywords,
        chapters: v.chapters,
        faqs: v.faqs,
        transcriptMl: v.transcript?.correctedMl,
      }),
    ),
  );

  // Articles (published).
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    include: { video: { select: { titleEn: true, enrichment: { select: { summaryEn: true } } } } },
  });
  await search.upsertArticles(
    articles.map((a) =>
      buildArticleDoc({
        id: a.id,
        slug: a.slug,
        titleMl: a.titleMl,
        status: a.status,
        bodyMl: a.bodyMl,
        bodyEn: a.bodyEn,
        updatedAt: a.updatedAt,
        video: a.video ? { titleEn: a.video.titleEn, summaryEn: a.video.enrichment?.summaryEn } : null,
      }),
    ),
  );

  // Topics.
  const topics = await prisma.topic.findMany();
  await search.upsertTopics(topics.map((t) => buildTopicDoc(t)));

  // FAQs (of published videos).
  const faqs = await prisma.faq.findMany({
    where: { video: { status: "PUBLISHED" } },
    include: { video: { select: { slug: true } } },
  });
  await search.upsertFaqs(
    faqs.map((f) =>
      buildFaqDoc({
        id: f.id,
        videoId: f.videoId,
        videoSlug: f.video.slug,
        questionMl: f.questionMl,
        questionEn: f.questionEn,
        answerMl: f.answerMl,
        timestampSec: f.timestampSec,
      }),
    ),
  );

  // Synonyms from approved SynonymMapping rows.
  const syn = await prisma.synonymMapping.findMany({
    where: { approved: true },
    select: { variant: true, canonical: true },
  });
  await search.syncSynonyms(syn);

  console.log(
    `[reindex] done: ${videos.length} videos, ${articles.length} articles, ${topics.length} topics, ${faqs.length} faqs, ${syn.length} synonyms`,
  );
  await prisma.$disconnect();
}

main().catch(async (err: unknown) => {
  console.error("[reindex] failed", err);
  await prisma.$disconnect();
  process.exit(1);
});
