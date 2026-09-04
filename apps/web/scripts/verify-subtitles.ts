import { PrismaClient } from "@vaidyasala/db";

const prisma = new PrismaClient();

/**
 * Verify subtitle coverage and report statistics
 * Usage: npx ts-node apps/web/scripts/verify-subtitles.ts
 */
async function verifySubtitles() {
  try {
    const videos = await prisma.video.findMany({
      where: { status: "PUBLISHED" },
      include: { subtitle: true },
    });

    const completed = videos.filter((v) => v.subtitle?.status === "completed").length;
    const processing = videos.filter((v) => v.subtitle?.status === "processing").length;
    const failed = videos.filter((v) => v.subtitle?.status === "failed").length;
    const pending = videos.filter((v) => !v.subtitle).length;

    const total = videos.length;
    const coverage = ((completed / total) * 100).toFixed(1);

    console.log(`
╔════════════════════════════════════════════════════════╗
║                   📊 SUBTITLE STATISTICS               ║
╚════════════════════════════════════════════════════════╝

📺 Total Videos:        ${total}
✅ With Subtitles:       ${completed} (${coverage}%)
⏳ Processing:           ${processing}
❌ Failed:               ${failed}
⏸️  Pending:             ${pending}

${coverage >= "80"
      ? `🎉 EXCELLENT: ${coverage}% coverage achieved!`
      : coverage >= "50"
        ? `👍 GOOD: ${coverage}% coverage. Keep going!`
        : `⚠️  FAIR: ${coverage}% coverage. More work needed.`
}

═══════════════════════════════════════════════════════════

Next steps:
1. Monitor processing: npx ts-node apps/web/scripts/process-all-subtitles.ts
2. Check again in 24h: npx ts-node apps/web/scripts/verify-subtitles.ts
3. Deploy when coverage > 80%
    `);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifySubtitles();
