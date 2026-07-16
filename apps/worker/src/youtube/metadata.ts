import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../env";

const execFileAsync = promisify(execFile);

/** One chapter parsed from a YouTube description or provider chapter list. */
export interface RawChapter {
  startSec: number;
  titleMl: string;
}

/** Normalized YouTube metadata consumed by the ingest job. */
export interface VideoMetadata {
  youtubeId: string;
  title: string;
  description: string;
  durationSec: number;
  ytPublishedAt: Date;
  /** name → source URL, best available per size bucket. */
  thumbnails: Record<string, string>;
  chapters: RawChapter[];
  hasCaptions: boolean;
  source: "youtube-data-api" | "yt-dlp";
}

/** Fetches + normalizes metadata for a video. Injectable for tests. */
export interface MetadataFetcher {
  fetch(youtubeId: string): Promise<VideoMetadata>;
}

/** ISO-8601 duration (PT#H#M#S) → seconds. */
export function parseIsoDuration(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, h, min, s] = m;
  return Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(s ?? 0);
}

/** "0:00", "1:23", "01:02:03" leading-timestamp → seconds. */
function timestampToSec(ts: string): number | null {
  const parts = ts.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  return null;
}

/**
 * Parse "mm:ss Title" chapter lines from a description (§2B — chapters from
 * description). Requires the first chapter to start at 0 to be considered a
 * valid chapter list (YouTube's own rule); returns [] otherwise.
 */
export function parseChaptersFromDescription(description: string): RawChapter[] {
  const out: RawChapter[] = [];
  const re = /^\s*[[(]?(\d{1,2}:\d{2}(?::\d{2})?)[\])]?\s*[-–—.)]?\s*(.+?)\s*$/;
  for (const line of description.split(/\r?\n/)) {
    const m = re.exec(line);
    if (!m) continue;
    const startSec = timestampToSec(m[1]!);
    const title = m[2]!.trim();
    if (startSec === null || !title) continue;
    out.push({ startSec, titleMl: title });
  }
  if (out.length < 2 || out[0]!.startSec !== 0) return [];
  // De-dup + sort ascending; drop non-monotonic noise.
  out.sort((a, b) => a.startSec - b.startSec);
  return out.filter((c, i) => i === 0 || c.startSec > out[i - 1]!.startSec);
}

interface YtDataApiItem {
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: Record<string, { url?: string }>;
  };
  contentDetails?: { duration?: string; caption?: string };
}

/** YouTube Data API fetcher (requires YOUTUBE_API_KEY). */
export function createDataApiFetcher(
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): MetadataFetcher {
  return {
    async fetch(youtubeId: string): Promise<VideoMetadata> {
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "snippet,contentDetails");
      url.searchParams.set("id", youtubeId);
      url.searchParams.set("key", apiKey);
      const res = await fetchFn(url.toString());
      if (!res.ok) throw new Error(`YouTube Data API ${res.status}: ${await res.text()}`);
      const body = (await res.json()) as { items?: YtDataApiItem[] };
      const item = body.items?.[0];
      if (!item) throw new Error(`video not found: ${youtubeId}`);
      const sn = item.snippet ?? {};
      const thumbs: Record<string, string> = {};
      for (const [name, t] of Object.entries(sn.thumbnails ?? {})) {
        if (t?.url) thumbs[name] = t.url;
      }
      const description = sn.description ?? "";
      return {
        youtubeId,
        title: sn.title ?? youtubeId,
        description,
        durationSec: parseIsoDuration(item.contentDetails?.duration ?? "PT0S"),
        ytPublishedAt: sn.publishedAt ? new Date(sn.publishedAt) : new Date(0),
        thumbnails: thumbs,
        chapters: parseChaptersFromDescription(description),
        hasCaptions: item.contentDetails?.caption === "true",
        source: "youtube-data-api",
      };
    },
  };
}

interface YtDlpJson {
  title?: string;
  description?: string;
  duration?: number;
  timestamp?: number;
  upload_date?: string;
  thumbnails?: { id?: string; url?: string; preference?: number; height?: number }[];
  chapters?: { start_time?: number; title?: string }[] | null;
  subtitles?: Record<string, unknown>;
  automatic_captions?: Record<string, unknown>;
}

function ytDlpUploadDate(j: YtDlpJson): Date {
  if (typeof j.timestamp === "number") return new Date(j.timestamp * 1000);
  if (j.upload_date && /^\d{8}$/.test(j.upload_date)) {
    const y = j.upload_date.slice(0, 4);
    const m = j.upload_date.slice(4, 6);
    const d = j.upload_date.slice(6, 8);
    return new Date(`${y}-${m}-${d}T00:00:00Z`);
  }
  return new Date(0);
}

/** yt-dlp `-J` metadata fetcher — no API key required (keyless fallback). */
export function createYtDlpFetcher(
  ytDlpPath: string = env.YT_DLP_PATH,
  exec: typeof execFileAsync = execFileAsync,
): MetadataFetcher {
  return {
    async fetch(youtubeId: string): Promise<VideoMetadata> {
      const { stdout } = await exec(
        ytDlpPath,
        ["-J", "--no-warnings", `https://www.youtube.com/watch?v=${youtubeId}`],
        { maxBuffer: 64 * 1024 * 1024 },
      );
      const j = JSON.parse(stdout) as YtDlpJson;
      const thumbs: Record<string, string> = {};
      for (const t of (j.thumbnails ?? []).filter((x) => x.url)) {
        thumbs[t.id ?? String(t.preference ?? Object.keys(thumbs).length)] = t.url!;
      }
      const description = j.description ?? "";
      const chapters: RawChapter[] = Array.isArray(j.chapters)
        ? j.chapters
            .filter((c) => typeof c.start_time === "number" && c.title)
            .map((c) => ({ startSec: Math.floor(c.start_time!), titleMl: c.title! }))
        : [];
      return {
        youtubeId,
        title: j.title ?? youtubeId,
        description,
        durationSec: Math.floor(j.duration ?? 0),
        ytPublishedAt: ytDlpUploadDate(j),
        thumbnails: thumbs,
        chapters: chapters.length > 0 ? chapters : parseChaptersFromDescription(description),
        hasCaptions:
          Object.keys(j.subtitles ?? {}).length > 0 ||
          Object.keys(j.automatic_captions ?? {}).length > 0,
        source: "yt-dlp",
      };
    },
  };
}

/**
 * Metadata fetcher from env: YouTube Data API when a key is present, else the
 * keyless yt-dlp fallback (decision logged in DECISIONS.md).
 */
export function createMetadataFetcher(): MetadataFetcher {
  return env.YOUTUBE_API_KEY
    ? createDataApiFetcher(env.YOUTUBE_API_KEY)
    : createYtDlpFetcher();
}
