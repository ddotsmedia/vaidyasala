import "server-only";
import type { Route } from "next";
import { prisma } from "@vaidyasala/db";
import { transcriptSegmentSchema, type TranscriptSegment } from "@vaidyasala/core/validation";
import type { VideoCardData } from "@vaidyasala/ui";
import { thumbnailSrcSet } from "./thumbnail";

export interface Takeaway {
  ml: string;
  en?: string;
}

export interface WatchChapter {
  startSec: number;
  titleMl: string;
  titleEn?: string | null;
}
export interface WatchFaq {
  id: string;
  questionMl: string;
  answerMl: string;
  timestampSec: number | null;
}

export interface WatchData {
  id: string;
  youtubeId: string;
  slug: string;
  titleMl: string;
  titleEn: string | null;
  description: string | null;
  thumbnailUrl: string;
  durationSec: number;
  publishedAt: string | null;
  updatedAt: string;
  viewCount?: number;
  transcriptText: string | null;
  channelUrl: string;
  subscriberCount?: number;
  topic: { slug: string; nameMl: string } | null;
  summaryMl: string | null;
  summaryEn: string | null;
  takeaways: Takeaway[];
  segments: TranscriptSegment[];
  chapters: WatchChapter[];
  faqs: WatchFaq[];
  related: (VideoCardData & { watchHref: Route })[];
}

/** Best thumbnail URL from the Video.thumbnails Json (ingest or seed shape). */
export function thumbnailUrl(
  youtubeId: string,
  thumbnails: unknown,
): string {
  const t = thumbnails as Record<string, unknown> | null;
  if (t) {
    for (const key of ["maxres", "standard", "high", "hq", "default"]) {
      const v = t[key];
      if (typeof v === "string") return v;
      if (v && typeof v === "object" && typeof (v as { url?: string }).url === "string") {
        return (v as { url: string }).url;
      }
    }
  }
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

/**
 * The two thumbnail fields every VideoCardData needs, from one call. Spread
 * this rather than setting `thumbnailUrl` alone — a card built without the
 * srcset silently downloads a 1280×720 still into a ~300px slot.
 */
export function cardThumbnail(
  youtubeId: string,
  thumbnails: unknown,
): { thumbnailUrl: string; thumbnailSrcSet: string | undefined } {
  const url = thumbnailUrl(youtubeId, thumbnails);
  return { thumbnailUrl: url, thumbnailSrcSet: thumbnailSrcSet(url) };
}

function channelUrl(): string {
  const id = process.env.YOUTUBE_CHANNEL_ID;
  return id
    ? `https://www.youtube.com/channel/${id}?sub_confirmation=1`
    : "https://www.youtube.com/@vaidyasala?sub_confirmation=1";
}

/** Published video + everything the watch page renders. Null if not found/published. */
export async function getVideoBySlug(slug: string): Promise<WatchData | null> {
  const video = await prisma.video.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      primaryTopic: { select: { slug: true, nameMl: true } },
      transcript: { select: { segments: true, correctedMl: true, rawMl: true } },
      enrichment: { select: { summaryMl: true, summaryEn: true, keyTakeaways: true } },
      chapters: { orderBy: { startSec: "asc" } },
      faqs: { orderBy: { order: "asc" } },
      relatedFrom: {
        orderBy: { score: "desc" },
        take: 12,
        include: {
          to: {
            select: {
              slug: true,
              titleMl: true,
              titleEn: true,
              youtubeId: true,
              durationSec: true,
              thumbnails: true,
              primaryTopic: { select: { slug: true, nameMl: true, nameEn: true } },
            },
          },
        },
      },
    },
  });
  if (!video) return null;

  const segments = transcriptSegmentSchema
    .array()
    .safeParse(video.transcript?.segments ?? []);

  const stats = video.stats as { subscribers?: number; views?: number } | null;

  return {
    id: video.id,
    youtubeId: video.youtubeId,
    slug: video.slug,
    titleMl: video.titleMl,
    titleEn: video.titleEn,
    description: video.description,
    thumbnailUrl: thumbnailUrl(video.youtubeId, video.thumbnails),
    durationSec: video.durationSec,
    publishedAt: video.publishedAt?.toISOString() ?? null,
    updatedAt: video.updatedAt.toISOString(),
    viewCount: stats?.views,
    transcriptText: video.transcript?.correctedMl ?? video.transcript?.rawMl ?? null,
    channelUrl: channelUrl(),
    subscriberCount: stats?.subscribers,
    topic: video.primaryTopic,
    summaryMl: video.enrichment?.summaryMl ?? null,
    summaryEn: video.enrichment?.summaryEn ?? null,
    takeaways: ((video.enrichment?.keyTakeaways as Takeaway[] | null) ?? []).filter((t) => t.ml),
    segments: segments.success ? segments.data : [],
    chapters: video.chapters.map((c) => ({
      startSec: c.startSec,
      titleMl: c.titleMl,
      titleEn: c.titleEn,
    })),
    faqs: video.faqs.map((f) => ({
      id: f.id,
      questionMl: f.questionMl,
      answerMl: f.answerMl,
      timestampSec: f.timestampSec,
    })),
    related: video.relatedFrom.map((e) => ({
      slug: e.to.slug,
      titleMl: e.to.titleMl,
      titleEn: e.to.titleEn ?? undefined,
      ...cardThumbnail(e.to.youtubeId, e.to.thumbnails),
      durationSec: e.to.durationSec,
      topic: e.to.primaryTopic
        ? {
            slug: e.to.primaryTopic.slug,
            nameMl: e.to.primaryTopic.nameMl,
            nameEn: e.to.primaryTopic.nameEn,
          }
        : undefined,
      watchHref: `/watch/${e.to.slug}` as Route,
    })),
  };
}

/** Published slugs for ISR prerender + sitemap (Phase 3C). */
export async function publishedSlugs(limit = 500): Promise<string[]> {
  const rows = await prisma.video.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
    take: limit,
  });
  return rows.map((r) => r.slug);
}

/**
 * Get the best available English title for a video.
 * Prefers: titleEn > titleEnAuto > titleMl
 *
 * This ensures every video has a title in the current display context,
 * falling back to Malayalam if English metadata is not available.
 */
export function getVideoTitle(video: {
  titleMl: string;
  titleEn?: string | null;
  titleEnAuto?: string | null;
}): string {
  return video.titleEn || video.titleEnAuto || video.titleMl;
}

/**
 * Extract keywords from a comma-separated keyword string.
 * Returns empty array if no keywords present.
 */
export function getVideoKeywords(video: { keywords?: string | null }): string[] {
  if (!video.keywords) return [];
  return video.keywords.split(", ").filter((kw) => kw.trim().length > 0);
}
