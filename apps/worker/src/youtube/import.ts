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
  doc: VideoSearchDoc;
}

/**
 * Write one video. Idempotent: an existing row has its metadata and stats
 * refreshed but keeps its slug and status — a published URL must not move, and
 * re-running must never quietly un-publish or re-publish anything.
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
    select: { id: true },
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
    },
  });

  return {
    id: video.id,
    slug: video.slug,
    title: video.titleMl,
    views,
    likes,
    created: !existing,
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
