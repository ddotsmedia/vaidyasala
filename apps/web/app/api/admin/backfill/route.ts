import { NextRequest, NextResponse } from "next/server";
import { Queue } from "bullmq";
import { redis } from "@vaidyasala/core";
import { QUEUE_NAME, YouTubeBackfillJobData } from "@vaidyasala/worker/jobs/youtube-backfill";

export async function GET(req: NextRequest) {
  try {
    const queue = new Queue(QUEUE_NAME, { connection: redis });

    const [active, delayed, waiting, completed, failed] = await Promise.all([
      queue.getActiveCount(),
      queue.getDelayedCount(),
      queue.getWaitingCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    const recentJobs = await queue.getJobs(["active", "completed", "failed"], 0, 10);

    const jobsInfo = recentJobs.map((job) => ({
      id: job.id,
      state: job.getState(),
      data: job.data,
      progress: job.progress(),
      attempts: job.attempts,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      timestamp: job.timestamp,
    }));

    return NextResponse.json({
      queue: {
        active,
        delayed,
        waiting,
        completed,
        failed,
      },
      recentJobs: jobsInfo,
    });
  } catch (error) {
    console.error("[backfill-api] GET failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<YouTubeBackfillJobData>;

    const queue = new Queue<YouTubeBackfillJobData>(QUEUE_NAME, { connection: redis });

    const activeCount = await queue.getActiveCount();
    if (activeCount > 0) {
      return NextResponse.json(
        { error: "Backfill already running. Wait for it to complete." },
        { status: 409 }
      );
    }

    const job = await queue.add(
      "youtube-backfill",
      {
        limit: body.limit || 999999,
        dryRun: body.dryRun || false,
        delay: body.delay || 1000,
        triggerMode: body.triggerMode || "import",
      },
      {
        jobId: `backfill-${Date.now()}`,
        removeOnComplete: { age: 3600 },
      }
    );

    return NextResponse.json({
      message: "Backfill job queued",
      jobId: job.id,
      mode: body.triggerMode || "import",
    });
  } catch (error) {
    console.error("[backfill-api] POST failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
