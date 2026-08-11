import { Job, Queue, Worker } from "bullmq";
import { redis } from "@vaidyasala/core";
import { PrismaClient } from "@prisma/client";
import { createYouTubeClient } from "@vaidyasala/core";

const prisma = new PrismaClient();
const QUEUE_NAME = "youtube-backfill";
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || "UCADw8vrx5oszMLul5PHzCqA";
const YT_API_KEY = process.env.YOUTUBE_API_KEY;

export interface YouTubeBackfillJobData {
  limit?: number;
  dryRun?: boolean;
  delay?: number;
  triggerMode?: "import" | "publish";
}

export interface YouTubeBackfillProgress {
  status: "pending" | "running" | "completed" | "failed";
  processed: number;
  total: number;
  duplicates: number;
  created: number;
  message: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

function promotionFor(currentStatus: string): string | null {
  if (currentStatus === "INGESTING") return "PUBLISHED";
  return null;
}

async function youtubeBackfillHandler(job: Job<YouTubeBackfillJobData>) {
  if (!YT_API_KEY) {
    throw new Error("YOUTUBE_API_KEY not set");
  }

  const client = createYouTubeClient(YT_API_KEY);
  const { limit = 999999, dryRun = false, delay = 1000, triggerMode = "import" } = job.data;

  const progress: YouTubeBackfillProgress = {
    status: "running",
    processed: 0,
    total: 0,
    duplicates: 0,
    created: 0,
    message: "Initializing...",
    startedAt: new Date(),
  };

  try {
    if (triggerMode === "publish") {
      job.log("Promoting INGESTING videos to PUBLISHED...");

      const promoted = await prisma.video.updateMany({
        where: { status: "INGESTING" },
        data: { status: "PUBLISHED" },
      });

      progress.created = promoted.count;
      progress.processed = promoted.count;
      progress.total = promoted.count;
      progress.message = `Published ${promoted.count} videos`;
      progress.status = "completed";
      progress.completedAt = new Date();

      job.log(`✅ Published ${promoted.count} videos`);
      return progress;
    }

    job.log(`Fetching videos from YouTube channel ${YOUTUBE_CHANNEL_ID}...`);

    let pageToken: string | undefined;
    const allVideos: Array<{
      youtubeId: string;
      titleMl: string;
      description: string;
      thumbnail: string;
      duration: number;
      publishedAt: Date;
    }> = [];

    while (true) {
      if (allVideos.length >= limit) break;

      const res = await client.getChannelVideos(YOUTUBE_CHANNEL_ID, pageToken);
      progress.total = Math.max(progress.total, res.totalResults);

      for (const video of res.videos) {
        if (allVideos.length >= limit) break;

        allVideos.push({
          youtubeId: video.youtubeId,
          titleMl: video.title,
          description: video.description,
          thumbnail: video.thumbnails.high || video.thumbnails.medium || "",
          duration: video.durationSec,
          publishedAt: video.publishedAt,
        });
      }

      pageToken = res.nextPageToken;
      if (!pageToken) break;

      if (allVideos.length < limit && pageToken) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    job.log(`Fetched ${allVideos.length} videos from YouTube`);

    if (dryRun) {
      progress.message = `DRY RUN: ${allVideos.length} videos ready to import`;
      progress.processed = allVideos.length;
      progress.status = "completed";
      progress.completedAt = new Date();
      job.log(`✅ Dry run complete`);
      return progress;
    }

    for (let i = 0; i < allVideos.length; i++) {
      const video = allVideos[i];
      progress.processed = i + 1;
      progress.message = `Importing ${i + 1}/${allVideos.length}: "${video.titleMl.substring(0, 40)}..."`;

      job.progress((progress.processed / allVideos.length) * 100);
      job.log(`[${i + 1}/${allVideos.length}] ${video.titleMl}`);

      const existing = await prisma.video.findUnique({
        where: { youtubeId: video.youtubeId },
      });

      if (existing) {
        progress.duplicates++;
        continue;
      }

      const baseSlug = video.titleMl
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s-]+/g, "-")
        .slice(0, 100);

      let slug = baseSlug;
      let counter = 1;
      while (await prisma.video.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      await prisma.video.create({
        data: {
          youtubeId: video.youtubeId,
          slug,
          titleMl: video.titleMl,
          titleEn: "",
          descriptionMl: video.description,
          descriptionEn: "",
          thumbnailUrl: video.thumbnail,
          duration: video.duration,
          viewCount: 0,
          status: "INGESTING",
          publishedAt: video.publishedAt,
          source: "YOUTUBE",
        },
      });

      progress.created++;

      if (i < allVideos.length - 1 && (i + 1) % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    progress.message = `✅ Imported ${progress.created} videos (${progress.duplicates} duplicates)`;
    progress.status = "completed";
    progress.completedAt = new Date();

    job.log(`✅ Import complete: ${progress.created} created, ${progress.duplicates} skipped`);
    return progress;
  } catch (error) {
    progress.status = "failed";
    progress.error = error instanceof Error ? error.message : String(error);
    progress.completedAt = new Date();

    job.log(`❌ Error: ${progress.error}`);
    throw error;
  }
}

export async function initializeBackfillQueue() {
  if (!YT_API_KEY) {
    console.log("[backfill-queue] YouTube API key not configured, skipping");
    return null;
  }

  const queue = new Queue<YouTubeBackfillJobData>(QUEUE_NAME, { connection: redis });

  const worker = new Worker<YouTubeBackfillJobData>(QUEUE_NAME, youtubeBackfillHandler, {
    connection: redis,
    concurrency: 1,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 3600 },
    },
  });

  worker.on("completed", (job) => {
    console.log(`[backfill-queue] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[backfill-queue] Job ${job?.id} failed:`, err.message);
  });

  console.log("[backfill-queue] Queue initialized and ready");
  return queue;
}

export { QUEUE_NAME };
