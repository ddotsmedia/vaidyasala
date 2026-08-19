/**
 * Verify data enrichment status
 *
 * Usage: npx ts-node apps/web/scripts/verify-enrichment.ts
 *
 * Shows:
 * - Total videos
 * - With titleEn (manual)
 * - With titleEnAuto (auto-generated)
 * - With keywords
 */

import "server-only";
import { prisma } from "@vaidyasala/db";

async function verifyEnrichment() {
  console.log("\n📊 VIDEO ENRICHMENT VERIFICATION REPORT\n");
  console.log("═".repeat(55));

  // Fetch all videos with relevant fields
  // @ts-expect-error titleEnAuto added in migration, not yet in generated types
  const videos = await prisma.video.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      titleMl: true,
      titleEn: true,
      titleEnAuto: true,
    },
  }) as Array<{ id: string; titleMl: string; titleEn: string | null; titleEnAuto: string | null }>;

  const total = videos.length;
  const withTitleEn = videos.filter((v: typeof videos[0]) => v.titleEn).length;
  const withTitleEnAuto = videos.filter((v: typeof videos[0]) => v.titleEnAuto).length;
  const withEitherTitle = videos.filter((v: typeof videos[0]) => v.titleEn || v.titleEnAuto).length;

  console.log(`Total Published Videos: ${total}`);
  console.log(`With Manual titleEn:    ${withTitleEn} (${percent(withTitleEn, total)})`);
  console.log(`With Auto titleEnAuto:  ${withTitleEnAuto} (${percent(withTitleEnAuto, total)})`);
  console.log(`With Either Title:      ${withEitherTitle} (${percent(withEitherTitle, total)})`);
  console.log("═".repeat(55));

  // Show status breakdown
  const needsEnrichment = videos.filter((v: typeof videos[0]) => !v.titleEn && !v.titleEnAuto);
  if (needsEnrichment.length > 0) {
    console.log(`\n⚠️  ${needsEnrichment.length} videos need enrichment`);
    if (needsEnrichment.length <= 10) {
      needsEnrichment.forEach((v: typeof videos[0]) => {
        console.log(`   - ${v.titleMl.substring(0, 50)}`);
      });
    }
  } else {
    console.log("\n✅ All videos have English titles!");
  }

  console.log("\n");
}

function percent(value: number, total: number): string {
  return `${((value / total) * 100).toFixed(1)}%`;
}

verifyEnrichment().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
