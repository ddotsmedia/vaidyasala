import "server-only";
import { prisma } from "@vaidyasala/db";
import type { VideoCardData } from "@vaidyasala/ui";
import { thumbnailUrl } from "./video";

const cardSelect = {
  slug: true,
  titleMl: true,
  titleEn: true,
  youtubeId: true,
  thumbnails: true,
  durationSec: true,
  primaryTopic: { select: { slug: true, nameMl: true, nameEn: true } },
} as const;

interface CardRow {
  slug: string;
  titleMl: string;
  titleEn: string | null;
  youtubeId: string;
  thumbnails: unknown;
  durationSec: number;
  primaryTopic: { slug: string; nameMl: string; nameEn: string } | null;
}

export function toCard(v: CardRow): VideoCardData {
  return {
    slug: v.slug,
    titleMl: v.titleMl,
    titleEn: v.titleEn ?? undefined,
    thumbnailUrl: thumbnailUrl(v.youtubeId, v.thumbnails),
    durationSec: v.durationSec,
    topic: v.primaryTopic
      ? { slug: v.primaryTopic.slug, nameMl: v.primaryTopic.nameMl, nameEn: v.primaryTopic.nameEn }
      : undefined,
  };
}

const PUBLISHED = { status: "PUBLISHED" as const };

export async function getFeatured(): Promise<VideoCardData | null> {
  const v = await prisma.video.findFirst({
    where: PUBLISHED,
    orderBy: [{ qualityScore: "desc" }, { publishedAt: "desc" }],
    select: cardSelect,
  });
  return v ? toCard(v) : null;
}

export async function getLatest(limit = 8, skip = 0): Promise<VideoCardData[]> {
  const rows = await prisma.video.findMany({
    where: PUBLISHED,
    orderBy: { publishedAt: "desc" },
    take: limit,
    skip,
    select: cardSelect,
  });
  return rows.map(toCard);
}

/** Engagement-ranked over a rolling window (§1.1 /trending; 7-day default). */
export async function getTrending(limit = 8, days = 7): Promise<VideoCardData[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const grouped = await prisma.analyticsEvent.groupBy({
    by: ["videoId"],
    where: { name: "play", createdAt: { gt: since }, videoId: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { videoId: "desc" } },
    take: limit,
  });
  const ids = grouped.map((g) => g.videoId).filter((id): id is string => Boolean(id));
  if (ids.length === 0) {
    // Cold start: fall back to stats-based popularity (seed has no events yet).
    const rows = await prisma.video.findMany({ where: PUBLISHED, take: limit, select: cardSelect });
    return rows.map(toCard);
  }
  const rows = await prisma.video.findMany({
    where: { id: { in: ids }, ...PUBLISHED },
    select: { ...cardSelect, id: true },
  });
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)).map(toCard);
}

export async function getRecommended(limit = 8): Promise<VideoCardData[]> {
  const rows = await prisma.video.findMany({
    where: PUBLISHED,
    orderBy: { qualityScore: "desc" },
    take: limit,
    select: cardSelect,
  });
  return rows.map(toCard);
}

export interface TopicCard {
  slug: string;
  nameMl: string;
  nameEn: string;
  kind: string;
  videoCount: number;
}

export async function getPopularTopics(limit = 8): Promise<TopicCard[]> {
  const topics = await prisma.topic.findMany({
    take: limit,
    include: { _count: { select: { videos: true } } },
  });
  return topics
    .map((t) => ({
      slug: t.slug,
      nameMl: t.nameMl,
      nameEn: t.nameEn,
      kind: t.kind,
      videoCount: t._count.videos,
    }))
    .sort((a, b) => b.videoCount - a.videoCount);
}

export interface ArticleCard {
  slug: string;
  titleMl: string;
  readingMin: number;
}

export async function getLatestArticles(limit = 4): Promise<ArticleCard[]> {
  const rows = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { slug: true, titleMl: true, readingMin: true },
  });
  return rows;
}

/** All topics for the hub index, grouped by kind. */
export async function listTopics(): Promise<TopicCard[]> {
  const topics = await prisma.topic.findMany({
    orderBy: { nameEn: "asc" },
    include: { _count: { select: { videos: true } } },
  });
  return topics.map((t) => ({
    slug: t.slug,
    nameMl: t.nameMl,
    nameEn: t.nameEn,
    kind: t.kind,
    videoCount: t._count.videos,
  }));
}

export async function getTopicBySlug(slug: string) {
  const topic = await prisma.topic.findUnique({
    where: { slug },
    include: {
      videos: {
        orderBy: { score: "desc" },
        include: { video: { select: { ...cardSelect, status: true } } },
      },
    },
  });
  if (!topic) return null;
  const videos = topic.videos
    .filter((tv) => tv.video.status === "PUBLISHED")
    .map((tv) => toCard(tv.video));
  const heroVideo = videos[0] ?? null;
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", video: { topics: { some: { topicId: topic.id } } } },
    take: 6,
    select: { slug: true, titleMl: true, readingMin: true },
  });
  const faqs = await prisma.faq.findMany({
    where: { video: { topics: { some: { topicId: topic.id } } } },
    take: 8,
    orderBy: { order: "asc" },
    select: { id: true, questionMl: true, answerMl: true },
  });
  return {
    slug: topic.slug,
    nameMl: topic.nameMl,
    nameEn: topic.nameEn,
    kind: topic.kind,
    descriptionMl: topic.descriptionMl,
    ayurconnectUrl: topic.ayurconnectUrl,
    heroVideo,
    videos,
    articles,
    faqs,
  };
}

export async function getArticleBySlug(slug: string) {
  const article = await prisma.article.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { video: { select: { ...cardSelect, id: true } } },
  });
  if (!article) return null;
  return {
    slug: article.slug,
    titleMl: article.titleMl,
    bodyMl: article.bodyMl,
    readingMin: article.readingMin,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    sourceVideo: article.video ? toCard(article.video) : null,
    sourceVideoSlug: article.video?.slug ?? null,
  };
}

export async function listPlaylists() {
  const playlists = await prisma.playlist.findMany({
    orderBy: { titleMl: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return playlists.map((p) => ({ slug: p.slug, titleMl: p.titleMl, count: p._count.items }));
}

export async function getPlaylistBySlug(slug: string) {
  const playlist = await prisma.playlist.findUnique({
    where: { slug },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { video: { select: { ...cardSelect, status: true } } },
      },
    },
  });
  if (!playlist) return null;
  return {
    slug: playlist.slug,
    titleMl: playlist.titleMl,
    videos: playlist.items
      .filter((i) => i.video.status === "PUBLISHED")
      .map((i) => toCard(i.video)),
  };
}

export async function publishedTopicSlugs(): Promise<string[]> {
  const rows = await prisma.topic.findMany({ select: { slug: true } });
  return rows.map((r) => r.slug);
}
export async function publishedArticleSlugs(): Promise<string[]> {
  const rows = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}
export async function playlistSlugs(): Promise<string[]> {
  const rows = await prisma.playlist.findMany({ select: { slug: true } });
  return rows.map((r) => r.slug);
}
