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
  // An editor's manual pick wins (newest featuredAt). Nothing featured ⇒ fall
  // back to the automatic choice, so the hero is never empty.
  const manual = await prisma.video.findFirst({
    where: { ...PUBLISHED, featuredAt: { not: null } },
    orderBy: { featuredAt: "desc" },
    select: cardSelect,
  });
  if (manual) return toCard(manual);

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
  descriptionMl?: string | null;
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

export interface HeroVideo extends VideoCardData {
  /** AI summary if enriched, else the YouTube description. May be null. */
  blurb: string | null;
}

/**
 * Featured video for the hero, with the extra copy the hero renders over the
 * thumbnail. Separate from getFeatured() because every other caller wants the
 * lean card shape and should not pay for the description/enrichment join.
 */
export async function getFeaturedHero(): Promise<HeroVideo | null> {
  const heroSelect = {
    ...cardSelect,
    description: true,
    enrichment: { select: { summaryMl: true } },
  } as const;

  const manual = await prisma.video.findFirst({
    where: { ...PUBLISHED, featuredAt: { not: null } },
    orderBy: { featuredAt: "desc" },
    select: heroSelect,
  });
  const row =
    manual ??
    (await prisma.video.findFirst({
      where: PUBLISHED,
      orderBy: [{ qualityScore: "desc" }, { publishedAt: "desc" }],
      select: heroSelect,
    }));
  if (!row) return null;

  return {
    ...toCard(row),
    blurb: row.enrichment?.summaryMl ?? row.description ?? null,
  };
}

export interface TopicRail {
  slug: string;
  nameMl: string;
  nameEn: string;
  videos: VideoCardData[];
}

/**
 * One rail per topic for the "by category" section (§1.1). Only topics with
 * enough videos to look like a rail are returned — a two-item carousel reads as
 * a bug, not a category.
 */
export async function getTopicRails(
  railCount = 4,
  perRail = 8,
  minVideos = 3,
): Promise<TopicRail[]> {
  const topics = await prisma.topic.findMany({
    include: { _count: { select: { videos: true } } },
  });
  const candidates = topics
    .filter((t) => t._count.videos >= minVideos)
    .sort((a, b) => b._count.videos - a._count.videos)
    .slice(0, railCount);
  if (candidates.length === 0) return [];

  return Promise.all(
    candidates.map(async (t) => {
      const rows = await prisma.topicVideo.findMany({
        where: { topicId: t.id, video: PUBLISHED },
        orderBy: { score: "desc" },
        take: perRail,
        select: { video: { select: cardSelect } },
      });
      return {
        slug: t.slug,
        nameMl: t.nameMl,
        nameEn: t.nameEn,
        videos: rows.map((r) => toCard(r.video)),
      };
    }),
  );
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
    descriptionMl: t.descriptionMl,
  }));
}

/** A topic's video plus the fields its browser sorts and filters on. */
export interface TopicVideoItem extends VideoCardData {
  id: string;
  publishedAt: string | null;
  /** Plays in the trending window — the "trending" sort key. */
  plays: number;
}

/**
 * Play counts over a rolling window for a specific set of videos. Used to sort a
 * topic hub by trending without re-running the global trending query.
 */
export async function getPlayCounts(
  videoIds: string[],
  days = 7,
): Promise<Map<string, number>> {
  if (videoIds.length === 0) return new Map();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const grouped = await prisma.analyticsEvent.groupBy({
    by: ["videoId"],
    where: { name: "play", createdAt: { gt: since }, videoId: { in: videoIds } },
    _count: { _all: true },
  });
  return new Map(grouped.map((g) => [g.videoId as string, g._count._all]));
}

/**
 * Sibling topics for cross-linking (§1.3). Ranked by how many videos they share
 * with this one — a genuine content relationship rather than a name match —
 * then topped up with same-kind topics so the section is never empty on a
 * sparse catalogue.
 */
export async function getRelatedTopics(
  topicId: string,
  kind: string,
  limit = 5,
): Promise<TopicCard[]> {
  const ownVideoIds = (
    await prisma.topicVideo.findMany({ where: { topicId }, select: { videoId: true } })
  ).map((tv) => tv.videoId);

  const shared = ownVideoIds.length
    ? await prisma.topicVideo.groupBy({
        by: ["topicId"],
        where: { videoId: { in: ownVideoIds }, topicId: { not: topicId } },
        _count: { _all: true },
        orderBy: { _count: { topicId: "desc" } },
        take: limit,
      })
    : [];

  const ids = shared.map((s) => s.topicId);

  // Top up: same kind first (a nearer relative), then any other topic ranked by
  // catalogue size. Without the second pass a site with one topic per kind shows
  // an empty section, which is worse than a loose suggestion.
  const fillIds: string[] = [];
  for (const where of [
    { kind: kind as never, id: { notIn: [topicId, ...ids] } },
    { id: { notIn: [topicId, ...ids] } },
  ]) {
    const need = limit - ids.length - fillIds.length;
    if (need <= 0) break;
    const rows = await prisma.topic.findMany({
      where: { ...where, id: { notIn: [topicId, ...ids, ...fillIds] } },
      take: need,
      orderBy: { videos: { _count: "desc" } },
      select: { id: true },
    });
    fillIds.push(...rows.map((r) => r.id));
  }

  const orderedIds = [...ids, ...fillIds];
  if (orderedIds.length === 0) return [];

  const topics = await prisma.topic.findMany({
    where: { id: { in: orderedIds } },
    include: { _count: { select: { videos: true } } },
  });
  const rank = new Map(orderedIds.map((id, i) => [id, i]));
  return topics
    .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
    .map((t) => ({
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
        include: {
          video: {
            select: { ...cardSelect, id: true, status: true, publishedAt: true },
          },
        },
      },
    },
  });
  if (!topic) return null;

  const published = topic.videos.filter((tv) => tv.video.status === "PUBLISHED");
  const plays = await getPlayCounts(published.map((tv) => tv.video.id));
  const videos: TopicVideoItem[] = published.map((tv) => ({
    ...toCard(tv.video),
    id: tv.video.id,
    publishedAt: tv.video.publishedAt?.toISOString() ?? null,
    plays: plays.get(tv.video.id) ?? 0,
  }));
  const relatedTopics = await getRelatedTopics(topic.id, topic.kind);
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
    relatedTopics,
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
