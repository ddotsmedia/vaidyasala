import { NextResponse } from "next/server";
import { prisma } from "@vaidyasala/db";
import { transcribeYoutubeVideo, generateVTT, extractTranscript } from "@/lib/deepgram";

/**
 * POST /api/subtitles/process
 * Batch process all pending subtitle jobs
 * Can be called manually or via cron
 */
export async function POST(): Promise<NextResponse> {
  try {
    // BLOCKED: This endpoint should require admin auth in production
    console.log("[subtitles:process] Starting batch processing...");

    // Fetch all pending subtitles
    const pending = await prisma.subtitle.findMany({
      where: { status: "pending" },
      take: 10, // Process 10 at a time to avoid rate limiting
    });

    if (pending.length === 0) {
      return NextResponse.json(
        { message: "No pending subtitles", processed: 0 },
        { status: 200 }
      );
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const subtitle of pending) {
      try {
        // Get video to find youtubeId
        const video = await prisma.video.findUnique({
          where: { id: subtitle.videoId },
          select: { youtubeId: true, titleMl: true },
        });

        if (!video) {
          results.errors.push(`Video not found: ${subtitle.videoId}`);
          results.failed++;
          continue;
        }

        console.log(`[subtitles:process] Processing: ${video.titleMl}`);

        // Transcribe
        const result = await transcribeYoutubeVideo(video.youtubeId);
        const vtt = generateVTT(result.words);
        const transcript = extractTranscript(result.words);

        // Save to database
        await prisma.subtitle.update({
          where: { id: subtitle.id },
          data: {
            vtt,
            transcript,
            status: "completed",
            transcribedAt: new Date(),
            json: {
              transcript: result.transcript,
              words: result.words,
              confidence: result.confidence,
            },
          },
        });

        results.processed++;
        console.log(`✅ Completed: ${video.titleMl}`);

        // Rate limit: wait 5 seconds between requests
        await new Promise((r) => setTimeout(r, 5000));
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.errors.push(`${subtitle.videoId}: ${errorMsg}`);
        console.error(`❌ Failed: ${subtitle.videoId}`, errorMsg);

        // Mark as failed in database
        await prisma.subtitle.update({
          where: { id: subtitle.id },
          data: { status: "failed" },
        });
      }
    }

    console.log(
      `[subtitles:process] Batch complete: ${results.processed} processed, ${results.failed} failed`
    );

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Batch process error:", error);
    return NextResponse.json(
      { error: "Failed to process subtitles" },
      { status: 500 }
    );
  }
}
