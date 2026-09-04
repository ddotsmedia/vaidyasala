import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@vaidyasala/db";
import { transcribeYoutubeVideo, generateVTT, extractTranscript } from "@/lib/deepgram";

/**
 * GET /api/subtitles/[videoId]
 * Retrieve subtitles for a video (VTT format)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
): Promise<NextResponse> {
  try {
    const { videoId } = await params;

    const subtitle = await prisma.subtitle.findUnique({
      where: { videoId },
    });

    if (!subtitle) {
      return NextResponse.json({ error: "Subtitles not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        videoId,
        vtt: subtitle.vtt,
        transcript: subtitle.transcript,
        language: subtitle.language,
        status: subtitle.status,
        transcribedAt: subtitle.transcribedAt,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=31536000", // 1 year cache
        },
      }
    );
  } catch (error) {
    console.error("Fetch subtitles error:", error);
    return NextResponse.json({ error: "Failed to fetch subtitles" }, { status: 500 });
  }
}

/**
 * POST /api/subtitles/[videoId]
 * Start transcription job for a video
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
): Promise<NextResponse> {
  try {
    const { videoId } = await params;

    // Check if subtitle already exists
    const existing = await prisma.subtitle.findUnique({
      where: { videoId },
    });

    if (existing?.status === "completed") {
      return NextResponse.json(
        { status: "completed", videoId },
        { status: 200 }
      );
    }

    if (existing?.status === "processing") {
      return NextResponse.json(
        { status: "processing", videoId },
        { status: 202 }
      );
    }

    // Get video to find youtubeId
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { youtubeId: true },
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Create or update subtitle with processing status
    await prisma.subtitle.upsert({
      where: { videoId },
      update: { status: "processing" },
      create: {
        videoId,
        status: "processing",
      },
    });

    // Start background transcription (fire-and-forget)
    // In production, queue this job to a background worker
    transcribeYoutubeVideo(video.youtubeId)
      .then(async (result) => {
        const vtt = generateVTT(result.words);
        const transcript = extractTranscript(result.words);

        await prisma.subtitle.update({
          where: { videoId },
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

        console.log(`[subtitles] Completed: ${videoId}`);
      })
      .catch(async (error) => {
        console.error(`[subtitles] Failed: ${videoId}`, error);
        await prisma.subtitle.update({
          where: { videoId },
          data: { status: "failed" },
        });
      });

    return NextResponse.json(
      { status: "processing", videoId },
      { status: 202 }
    );
  } catch (error) {
    console.error("Subtitle request error:", error);
    return NextResponse.json({ error: "Failed to process subtitles" }, { status: 500 });
  }
}
