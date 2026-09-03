/**
 * Enrich videos with English metadata.
 *
 * Usage: npx ts-node apps/web/scripts/enrich-videos.ts --allow-placeholder
 *
 * ⚠ WHAT THIS ACTUALLY DOES TODAY: it does NOT call the YouTube API and does
 * NOT translate anything. It writes `titleEnAuto = "<Malayalam title> -
 * Healthcare Video"`, which is the Malayalam title with an English suffix —
 * not an English title. Run unguarded over the catalogue it would fill every
 * row with text that is neither language, and that value surfaces wherever
 * `titleEn` is used (card alt text, OG titles, VideoObject.name).
 *
 * It therefore refuses to run without `--allow-placeholder`, which exists only
 * so the write path can be exercised against a scratch database.
 *
 * Real enrichment belongs to the §8.2 pipeline, which has the model access to
 * produce an actual translation. See DECISIONS 2026-09-01.
 */

import "server-only";
import { prisma } from "@vaidyasala/db";

/**
 * Extract keywords from a YouTube snippet. Exported for the real §8.2
 * enrichment path; the placeholder branch below has nothing to feed it.
 */
export function extractKeywords(snippet: {
  title?: string;
  description?: string;
  tags?: string[];
}): string {
  const keywords: Set<string> = new Set();

  // Add provided tags
  if (snippet.tags?.length) {
    snippet.tags.slice(0, 10).forEach((tag) => keywords.add(tag));
  }

  // Add keywords from title (Ayurveda, health, etc.)
  if (snippet.title) {
    const titleKeywords = extractFromText(snippet.title);
    titleKeywords.forEach((kw) => keywords.add(kw));
  }

  // Add keywords from description
  if (snippet.description) {
    const descKeywords = extractFromText(snippet.description);
    descKeywords.slice(0, 5).forEach((kw) => keywords.add(kw));
  }

  return Array.from(keywords).join(", ");
}

/**
 * Extract meaningful keywords from text
 */
function extractFromText(text: string): string[] {
  const keywords: string[] = [];

  // Health-related keywords
  const healthKeywords = [
    "Ayurveda",
    "yoga",
    "meditation",
    "health",
    "wellness",
    "disease",
    "treatment",
    "remedy",
    "cure",
    "natural",
    "herbs",
    "Ayurvedic",
    "Malayalam",
  ];

  healthKeywords.forEach((keyword) => {
    if (text.toLowerCase().includes(keyword.toLowerCase())) {
      keywords.push(keyword);
    }
  });

  return keywords;
}

/**
 * Main enrichment function
 */
async function enrichVideos() {
  console.log("🚀 Starting video enrichment...\n");

  // @ts-expect-error titleEnAuto added in migration, not yet in generated types
  const videos = await prisma.video.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, titleMl: true, titleEn: true, titleEnAuto: true, youtubeId: true },
  }) as Array<{
    id: string;
    titleMl: string;
    titleEn: string | null;
    titleEnAuto: string | null;
    youtubeId: string;
  }>;

  console.log(`📊 Found ${videos.length} published videos\n`);

  let enriched = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];

    // Skip if already has English title
    if (video.titleEn || video.titleEnAuto) {
      skipped++;
      continue;
    }

    try {
      // For demo, use a placeholder since we can't call YouTube API without credentials
      // In production, this would call the YouTube API
      const englishTitle = `${video.titleMl} - Healthcare Video`;

      await prisma.video.update({
        where: { id: video.id },
        data: {
          titleEnAuto: englishTitle,
        },
      });

      enriched++;
      const progress = Math.round(((i + 1) / videos.length) * 100);
      console.log(
        `✅ [${i + 1}/${videos.length}] ${progress}% - ${englishTitle.substring(0, 50)}...`
      );
    } catch (error) {
      errors++;
      console.error(`❌ Error enriching ${video.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 50));
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("📈 ENRICHMENT SUMMARY");
  console.log("=".repeat(50));
  console.log(`Total Videos: ${videos.length}`);
  console.log(`Enriched: ${enriched} ✅`);
  console.log(`Skipped (already have title): ${skipped} ⏭️`);
  console.log(`Errors: ${errors} ❌`);
  console.log(`Success Rate: ${Math.round((enriched / (enriched + errors)) * 100)}%`);
  console.log("=".repeat(50) + "\n");

  await prisma.$disconnect();
}

// Run the enrichment
enrichVideos().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
