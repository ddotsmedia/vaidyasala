/** Content helpers: slug, chapters, related-scoring (§2). */

/**
 * Malayalam-aware slugify: transliterate-free, keeps Malayalam block, ASCII
 * lowercased, spaces→hyphens. Full Mozhi transliteration lands in Phase 4.
 */
export function slugifyMl(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
