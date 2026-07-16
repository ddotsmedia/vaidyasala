import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@vaidyasala/db";
import { createIngestProcessor, type IngestDeps } from "./ingest";
import type { StoragePort } from "../storage/s3";
import type { MetadataFetcher, VideoMetadata } from "../youtube/metadata";
import type { AudioExtractor } from "../youtube/audio";

const META: VideoMetadata = {
  youtubeId: "abcdefghijk",
  title: "പ്രമേഹം നിയന്ത്രിക്കാം",
  description: "0:00 Intro\n1:30 Diet\n5:00 Exercise",
  durationSec: 600,
  ytPublishedAt: new Date("2026-01-01T00:00:00Z"),
  thumbnails: { high: "https://i.ytimg.com/hq.jpg", maxres: "https://i.ytimg.com/mx.jpg" },
  chapters: [
    { startSec: 0, titleMl: "Intro" },
    { startSec: 90, titleMl: "Diet" },
  ],
  hasCaptions: true,
  source: "youtube-data-api",
};

/** In-memory prisma double recording the calls ingest makes. */
function fakePrisma() {
  const calls = {
    upsert: [] as unknown[],
    update: [] as unknown[],
    chaptersCreated: [] as unknown[],
    chaptersDeleted: 0,
  };
  const prisma = {
    video: {
      upsert: vi.fn(async (args: unknown) => {
        calls.upsert.push(args);
        return { id: "v1" };
      }),
      update: vi.fn(async (args: unknown) => {
        calls.update.push(args);
        return { id: "v1" };
      }),
    },
    chapter: {
      deleteMany: vi.fn(async () => {
        calls.chaptersDeleted++;
        return { count: 0 };
      }),
      createMany: vi.fn(async (args: { data: unknown[] }) => {
        calls.chaptersCreated.push(...args.data);
        return { count: args.data.length };
      }),
    },
  };
  return { prisma: prisma as unknown as PrismaClient, calls };
}

function memStorage(enabled = true): StoragePort & { store: Map<string, Uint8Array> } {
  const store = new Map<string, Uint8Array>();
  return {
    enabled,
    bucket: "test",
    store,
    async put(key, body) {
      store.set(key, body);
      return { key, url: `mem://${key}` };
    },
    urlFor: (key) => `mem://${key}`,
  };
}

const metadata: MetadataFetcher = { fetch: async () => META };
const audio: AudioExtractor = {
  extract: async () => ({ bytes: new Uint8Array([1, 2, 3]), contentType: "audio/mp4" }),
};

function baseDeps(over: Partial<IngestDeps> = {}): IngestDeps {
  const { prisma } = fakePrisma();
  return {
    prisma,
    storage: memStorage(),
    metadata,
    audio,
    fetchThumbnail: async () => new Uint8Array([9, 9]),
    enqueuePipeline: null,
    ...over,
  };
}

describe("createIngestProcessor", () => {
  it("ingests metadata, thumbnails, chapters, audio and flips to PROCESSING", async () => {
    const { prisma, calls } = fakePrisma();
    const storage = memStorage();
    const run = createIngestProcessor(baseDeps({ prisma, storage }));

    const result = await run({ youtubeId: "abcdefghijk", source: "manual" });

    expect(result.videoId).toBe("v1");
    expect(result.thumbsStored).toBe(2);
    expect(result.audioStored).toBe(true);
    expect(result.blocked).toEqual([]);
    // audio stored at the deterministic key 2C reads by.
    expect(storage.store.has("videos/abcdefghijk/audio.m4a")).toBe(true);
    // two thumbnails mirrored.
    expect([...storage.store.keys()].filter((k) => k.includes("thumb-")).length).toBe(2);
    // chapters replaced then created.
    expect(calls.chaptersDeleted).toBe(1);
    expect(calls.chaptersCreated).toHaveLength(2);
    // final update flips status.
    const lastUpdate = calls.update.at(-1) as { data: { status: string } };
    expect(lastUpdate.data.status).toBe("PROCESSING");
  });

  it("marks BLOCKED and skips media when storage is disabled", async () => {
    const run = createIngestProcessor(baseDeps({ storage: memStorage(false) }));
    const result = await run({ youtubeId: "abcdefghijk", source: "manual" });
    expect(result.audioStored).toBe(false);
    expect(result.thumbsStored).toBe(0);
    expect(result.blocked).toContain("storage-disabled:audio-not-extracted");
  });

  it("continues (BLOCKED) when audio extraction throws", async () => {
    const failingAudio: AudioExtractor = {
      extract: async () => {
        throw new Error("yt-dlp not found on PATH");
      },
    };
    const run = createIngestProcessor(baseDeps({ audio: failingAudio }));
    const result = await run({ youtubeId: "abcdefghijk", source: "manual" });
    expect(result.audioStored).toBe(false);
    expect(result.blocked.some((b) => b.startsWith("audio:"))).toBe(true);
  });

  it("enqueues the pipeline when a producer is provided", async () => {
    const enqueue = vi.fn(async () => {});
    const run = createIngestProcessor(baseDeps({ enqueuePipeline: enqueue }));
    await run({ youtubeId: "abcdefghijk", source: "manual" });
    expect(enqueue).toHaveBeenCalledWith("v1", "abcdefghijk");
  });
});
