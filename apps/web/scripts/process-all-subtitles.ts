import { PrismaClient } from "@vaidyasala/db";
import { transcribeYoutubeVideo, generateVTT, extractTranscript } from "../lib/deepgram";

const prisma = new PrismaClient();

/**
 * Batch process all subtitles for published videos
 * Usage: npx ts-node apps/web/scripts/process-all-subtitles.ts
 *
 * Note: This will take 80+ hours due to rate limiting
 * Recommendation: Run in a background screen/tmux session
 */
async function processAllSubtitles() {
  try {
    const videos = await prisma.video.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
    });

    console.log(`📺 Found ${videos.length} published videos`);
    console.log(`⏱️  Estimated time: ${Math.round((videos.length * 5) / 60)} hours`);
    console.log(`🔑 Using Deepgram API key: ${process.env.DEEPGRAM_API_KEY ? "✓" : "✗"}`);
    console.log("");

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const progress = `[${i + 1}/${videos.length}]`;

      try {
        // Check if already processed
        const existing = await prisma.subtitle.findUnique({
          where: { videoId: video.id },
        });

        if (existing?.status === "completed") {
          console.log(`${progress} ⏭️  Skip (already done): ${video.titleMl}`);
          continue;
        }

        console.log(`${progress} 🎬 Processing: ${video.titleMl}`);

        // Transcribe
        const result = await transcribeYoutubeVideo(video.youtubeId);
        const vtt = generateVTT(result.words);
        const transcript = extractTranscript(result.words);

        // Save to database
        await prisma.subtitle.upsert({
          where: { videoId: video.id },
          update: {
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
          create: {
            videoId: video.id,
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

        successCount++;
        console.log(`${progress} ✅ Complete: ${transcript.substring(0, 50)}...`);

        // Rate limit: 5 seconds between requests
        if (i < videos.length - 1) {
          console.log(`${progress} ⏰ Waiting 5 seconds before next request...`);
          await new Promise((r) => setTimeout(r, 5000));
        }
      } catch (error) {
        failCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${video.titleMl}: ${errorMsg}`);
        console.error(`${progress} ❌ Failed: ${errorMsg}`);

        // Mark as failed
        await prisma.subtitle.upsert({
          where: { videoId: video.id },
          update: { status: "failed" },
          create: {
            videoId: video.id,
            status: "failed",
          },
        });

        // Wait a bit before retrying
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    console.log("");
    console.log("═════════════════════════════════════════");
    console.log(`📊 FINAL RESULTS`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📈 Coverage: ${((successCount / videos.length) * 100).toFixed(1)}%`);
    if (errors.length > 0) {
      console.log("");
      console.log("Errors:");
      errors.slice(0, 10).forEach((e) => console.log(`  • ${e}`));
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run
processAllSubtitles().catch(console.error);
