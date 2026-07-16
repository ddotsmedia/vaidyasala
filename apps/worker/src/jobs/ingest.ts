import type { IngestJobData } from "@vaidyasala/core/queue";
import { slugifyMl } from "@vaidyasala/core/content";
import { type PrismaClient, VideoStatus } from "@vaidyasala/db";
import type { StoragePort } from "../storage/s3";
import { mediaKeys } from "../storage/s3";
import type { MetadataFetcher, VideoMetadata } from "../youtube/metadata";
import type { AudioExtractor } from "../youtube/audio";

/** Injected dependencies — everything external is a port, so ingest is testable. */
export interface IngestDeps {
  prisma: PrismaClient;
  storage: StoragePort;
  metadata: MetadataFetcher;
  audio: AudioExtractor;
  /** Download a thumbnail by URL → bytes. Defaults to global fetch. */
  fetchThumbnail?: (url: string) => Promise<Uint8Array>;
  /** Enqueue the §8.2 pipeline flow. Absent/null ⇒ ingest stops at PROCESSING (2B). */
  enqueuePipeline?: ((videoId: string, youtubeId: string) => Promise<void>) | null;
  log?: (msg: string) => void;
}

export interface IngestResult {
  videoId: string;
  youtubeId: string;
  thumbsStored: number;
  audioStored: boolean;
  blocked: string[];
  costUsd: number;
}

const CANON_THUMBS = ["maxres", "standard", "high", "medium", "default"];

/** Pick up to 3 thumbnails, preferring YouTube's canonical size buckets. */
function chooseThumbnails(thumbs: Record<string, string>): { name: string; url: string }[] {
  const canon = CANON_THUMBS.filter((n) => thumbs[n]).map((n) => ({ name: n, url: thumbs[n]! }));
  if (canon.length > 0) return canon.slice(0, 3);
  return Object.entries(thumbs)
    .slice(0, 3)
    .map(([name, url]) => ({ name, url }));
}

async function defaultFetchThumbnail(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`thumbnail ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * INGEST job (§8.2 step 0, §9.2): metadata → Video row, thumbnails → storage,
 * chapters from description/provider, audio (yt-dlp) → storage at a deterministic
 * key, then flip INGESTING → PROCESSING and enqueue the AI pipeline. Media/audio
 * failures are non-fatal (marked BLOCKED) so a missing binary never sinks ingest.
 */
export function createIngestProcessor(deps: IngestDeps) {
  const fetchThumb = deps.fetchThumbnail ?? defaultFetchThumbnail;
  const log = deps.log ?? (() => {});

  return async function runIngest(data: IngestJobData): Promise<IngestResult> {
    const { youtubeId } = data;
    const blocked: string[] = [];

    const meta: VideoMetadata = await deps.metadata.fetch(youtubeId);
    log(`[ingest] ${youtubeId} metadata via ${meta.source} (${meta.chapters.length} chapters)`);

    const slug = `${slugifyMl(meta.title).slice(0, 80) || "video"}-${youtubeId}`;

    const video = await deps.prisma.video.upsert({
      where: { youtubeId },
      create: {
        youtubeId,
        slug,
        status: VideoStatus.INGESTING,
        titleMl: meta.title,
        description: meta.description,
        durationSec: meta.durationSec,
        ytPublishedAt: meta.ytPublishedAt,
        thumbnails: meta.thumbnails,
        stats: {},
      },
      update: {
        titleMl: meta.title,
        description: meta.description,
        durationSec: meta.durationSec,
        ytPublishedAt: meta.ytPublishedAt,
        status: VideoStatus.INGESTING,
      },
    });

    // Thumbnails → storage (best-effort).
    const storedThumbs: Record<string, { key?: string; url: string }> = {};
    let thumbsStored = 0;
    for (const { name, url } of chooseThumbnails(meta.thumbnails)) {
      if (!deps.storage.enabled) {
        storedThumbs[name] = { url };
        continue;
      }
      try {
        const bytes = await fetchThumb(url);
        const { key, url: storedUrl } = await deps.storage.put(
          mediaKeys.thumbnail(youtubeId, name),
          bytes,
          "image/jpeg",
        );
        storedThumbs[name] = { key, url: storedUrl ?? url };
        thumbsStored++;
      } catch (err) {
        storedThumbs[name] = { url };
        log(`[ingest] thumbnail ${name} skipped: ${(err as Error).message}`);
      }
    }
    if (!deps.storage.enabled) blocked.push("storage-disabled:thumbnails-not-mirrored");

    // Chapters from description / provider (§2B).
    if (meta.chapters.length > 0) {
      await deps.prisma.chapter.deleteMany({ where: { videoId: video.id } });
      await deps.prisma.chapter.createMany({
        data: meta.chapters.map((c) => ({
          videoId: video.id,
          startSec: c.startSec,
          titleMl: c.titleMl,
        })),
        skipDuplicates: true,
      });
    }

    // Audio → storage at deterministic key (2C ASR reads it by key).
    let audioStored = false;
    if (deps.storage.enabled) {
      try {
        const audio = await deps.audio.extract(youtubeId);
        await deps.storage.put(mediaKeys.audio(youtubeId), audio.bytes, audio.contentType);
        audioStored = true;
      } catch (err) {
        blocked.push(`audio:${(err as Error).message}`);
        log(`[ingest] audio skipped: ${(err as Error).message}`);
      }
    } else {
      blocked.push("storage-disabled:audio-not-extracted");
    }

    await deps.prisma.video.update({
      where: { id: video.id },
      data: { status: VideoStatus.PROCESSING, thumbnails: storedThumbs },
    });

    if (deps.enqueuePipeline) {
      await deps.enqueuePipeline(video.id, youtubeId);
      log(`[ingest] ${youtubeId} → pipeline enqueued`);
    } else {
      log(`[ingest] ${youtubeId} PROCESSING; pipeline enqueue deferred (no stages registered)`);
    }

    return { videoId: video.id, youtubeId, thumbsStored, audioStored, blocked, costUsd: 0 };
  };
}
