import type { PrismaClient } from "@vaidyasala/db";
import { VideoStatus } from "@vaidyasala/db";
import { slugifyAscii } from "@vaidyasala/core/content";
import { buildVideoSearchDoc, type VideoSearchDoc } from "@vaidyasala/core/search";

/**
 * Shared YouTube → Video import logic (§9.1).
 *
 * Metadata only: title, description, thumbnails, duration, stats. It does NOT
 * run the §8.2 AI chain (ASR → correction → translation → chapters → enrichment
 * → embeddings) — that is the pipeline's job and where the money is spent. This
 * exists so the catalogue can be brought in cheaply and reviewed before any of
 * that is switched on.
 */

export interface YtVideoItem {
  id: string;
  snippet: {
    title: string;
    description?: string;
    channelId: string;
    publishedAt: string;
    thumbnails?: Record<string, { url?: string }>;
  };
  statistics?: { viewCount?: string; likeCount?: string };
  contentDetails?: { duration?: string };
}

const API = "https://www.googleapis.com/youtube/v3";

/** ISO-8601 duration (PT1H2M3S) → seconds. */
export function parseDuration(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

async function getJson<T>(url: URL): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json()) as T & { error?: { message: string } };
  if (json.error) throw new Error(`YouTube API: ${json.error.message}`);
  return json;
}

/**
 * Every upload id on a channel, oldest-page-first as YouTube returns them.
 * A channel's uploads playlist is its id with UC→UU, which costs one lookup
 * fewer than resolving it through channels.list.
 */
export async function listUploadIds(
  channelId: string,
  apiKey: string,
  max = Number.MAX_SAFE_INTEGER,
): Promise<string[]> {
  const uploads = channelId.startsWith("UC") ? `UU${channelId.slice(2)}` : channelId;
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${API}/playlistItems`);
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("playlistId", uploads);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const page = await getJson<{
      items?: { contentDetails?: { videoId?: string } }[];
      nextPageToken?: string;
    }>(url);

    for (const item of page.items ?? []) {
      const id = item.contentDetails?.videoId;
      if (id) ids.push(id);
      if (ids.length >= max) return ids;
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  return ids;
}

/** Details for up to 50 ids per call — the API's hard batch limit. */
export async function fetchVideoDetails(
  ids: string[],
  apiKey: string,
): Promise<YtVideoItem[]> {
  if (ids.length === 0) return [];
  const url = new URL(`${API}/videos`);
  url.searchParams.set("part", "snippet,statistics,contentDetails");
  url.searchParams.set("id", ids.slice(0, 50).join(","));
  url.searchParams.set("key", apiKey);
  const json = await getJson<{ items?: YtVideoItem[] }>(url);
  return json.items ?? [];
}

export interface UpsertResult {
  id: string;
  slug: string;
  title: string;
  views: number;
  likes: number;
  created: boolean;
  /** Existing INGESTING row flipped to PUBLISHED by --publish. */
  promoted: boolean;
  doc: VideoSearchDoc;
}

/**
 * Should an EXISTING row be promoted to PUBLISHED on this run?
 *
 * `--publish` has to work on a second pass, or the intended flow — import
 * everything, review it, then publish — silently does nothing because the row
 * already exists and the upsert's update branch never touched status.
 *
 * Only INGESTING is promoted:
 *   · HIDDEN is an editor's deliberate decision, not a bulk import's to reverse
 *   · PROCESSING is mid-pipeline and not ready to be seen
 *   · PUBLISHED is already there — re-publishing would reset publishedAt
 * Nothing here ever demotes. Pure so it can be tested without a database.
 */
export function promotionFor(
  existingStatus: VideoStatus | null,
  opts: { publish: boolean; existingPublishedAt: Date | null; ytPublishedAt: Date },
): { status: VideoStatus; publishedAt: Date } | Record<string, never> {
  if (!opts.publish || existingStatus !== VideoStatus.INGESTING) return {};
  return {
    status: VideoStatus.PUBLISHED,
    // Keep an existing date if one was somehow set; otherwise use YouTube's.
    publishedAt: opts.existingPublishedAt ?? opts.ytPublishedAt,
  };
}

/**
 * Write one video. Idempotent: an existing row has its metadata and stats
 * refreshed and keeps its slug — a published URL must not move — and its status
 * only ever moves forward, via promotionFor.
 */
export async function upsertVideo(
  prisma: PrismaClient,
  item: YtVideoItem,
  opts: { publish?: boolean } = {},
): Promise<UpsertResult> {
  const { snippet, statistics, contentDetails } = item;

  const thumbnails: Record<string, string> = {};
  for (const [name, t] of Object.entries(snippet.thumbnails ?? {})) {
    if (t?.url) thumbnails[name] = t.url;
  }

  const durationSec = parseDuration(contentDetails?.duration ?? "");
  const views = Number(statistics?.viewCount ?? 0);
  const likes = Number(statistics?.likeCount ?? 0);
  const ytPublishedAt = new Date(snippet.publishedAt);
  // ASCII only — a non-ASCII route segment prerenders as 404 (see slugifyAscii).
  const slug = `${slugifyAscii(snippet.title).slice(0, 80) || "video"}-${item.id}`;

  const existing = await prisma.video.findUnique({
    where: { youtubeId: item.id },
    select: { id: true, status: true, publishedAt: true },
  });

  const promote = promotionFor(existing?.status ?? null, {
    publish: opts.publish ?? false,
    existingPublishedAt: existing?.publishedAt ?? null,
    ytPublishedAt,
  });

  const video = await prisma.video.upsert({
    where: { youtubeId: item.id },
    create: {
      youtubeId: item.id,
      slug,
      status: opts.publish ? VideoStatus.PUBLISHED : VideoStatus.INGESTING,
      titleMl: snippet.title,
      description: snippet.description ?? "",
      durationSec,
      publishedAt: opts.publish ? ytPublishedAt : null,
      ytPublishedAt,
      thumbnails,
      stats: { views, likes },
    },
    update: {
      titleMl: snippet.title,
      description: snippet.description ?? "",
      durationSec,
      thumbnails,
      stats: { views, likes },
      ...promote,
    },
  });

  return {
    id: video.id,
    slug: video.slug,
    title: video.titleMl,
    views,
    likes,
    created: !existing,
    promoted: Object.keys(promote).length > 0,
    doc: buildVideoSearchDoc({
      id: video.id,
      slug: video.slug,
      titleMl: video.titleMl,
      titleEn: video.titleEn,
      status: video.status,
      durationSec: video.durationSec,
      publishedAt: video.publishedAt,
      viewCount: views,
    }),
  };
}
