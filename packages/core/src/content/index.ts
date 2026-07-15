/** Content helpers: slug, chapters, related-scoring (§2). */

/**
 * Malayalam-aware slugify: transliterate-free, keeps Malayalam block, ASCII
 * lowercased, spaces→hyphens. Full Mozhi transliteration lands in Phase 4.
 */
export function slugifyMl(input: string): string {
  return input
    .trim()
    .toLowerCase()
    // Keep letters, numbers, and combining marks (Malayalam vowel signs / virama
    // are \p{M}, not \p{L} — stripping them would mangle the script).
    .replace(/[^\p{L}\p{N}\p{M}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
