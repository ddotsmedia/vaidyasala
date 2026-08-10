/** Content helpers: slug, chapters, related-scoring (§2). */

/**
 * Malayalam-aware slugify: transliterate-free, keeps Malayalam block, ASCII
 * lowercased, spaces→hyphens. Full Mozhi transliteration lands in Phase 4.
 */
/**
 * URL-safe ASCII slug for route segments.
 *
 * Malayalam must NOT survive into a dynamic route segment: Next 16 does not
 * round-trip a non-ASCII `[slug]` param through prerendering — the page is
 * generated but baked with status 404, so the video is unreachable. Verified on
 * Linux, not a Windows path quirk.
 *
 * Callers always suffix the YouTube id, so uniqueness never depends on the
 * readable part; when a title is entirely Malayalam this correctly yields "" and
 * the caller's fallback takes over.
 *
 * `slugifyMl` below is unchanged and still right for anything that is not a URL
 * segment (display keys, admin-authored topic slugs typed in English).
 */
export function slugifyAscii(input: string): string {
  return input
    .normalize("NFKD")
    // Drop combining marks left by NFKD so "é" → "e" rather than "e" + U+0301.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

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

/**
 * Split text into overlapping character windows on sentence-ish boundaries.
 * Used by the CORRECT job to keep each LLM chunk near ~3k tokens (§8.2 step 2);
 * ~4 chars/token, so maxChars≈12k. Overlap preserves context across the seam.
 */
export function chunkText(text: string, maxChars = 12_000, overlapChars = 500): string[] {
  const clean = text.trim();
  if (clean.length <= maxChars) return clean.length ? [clean] : [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + maxChars, clean.length);
    if (end < clean.length) {
      // Prefer to break at the last sentence boundary / whitespace in-window.
      const slice = clean.slice(start, end);
      const brk = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("।"), slice.lastIndexOf("\n"));
      if (brk > maxChars * 0.5) end = start + brk + 1;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(end - overlapChars, start + 1);
  }
  return chunks;
}

/** Fraction of tokens that differ between two strings (0–1) — CORRECT diff-guard. */
export function changedRatio(before: string, after: string): number {
  const a = before.split(/\s+/).filter(Boolean);
  const b = after.split(/\s+/).filter(Boolean);
  if (a.length === 0) return b.length === 0 ? 0 : 1;
  const bCount = new Map<string, number>();
  for (const t of b) bCount.set(t, (bCount.get(t) ?? 0) + 1);
  let kept = 0;
  for (const t of a) {
    const n = bCount.get(t) ?? 0;
    if (n > 0) {
      kept++;
      bCount.set(t, n - 1);
    }
  }
  return Number((1 - kept / a.length).toFixed(4));
}

/** RelatedEdge score (§2): 0.6·embedding + 0.25·co-topic + 0.15·co-watch. */
export function relatedScore(parts: {
  embedding: number;
  coTopic: number;
  coWatch: number;
}): number {
  const clamp = (n: number): number => Math.max(0, Math.min(1, n));
  return Number(
    (0.6 * clamp(parts.embedding) + 0.25 * clamp(parts.coTopic) + 0.15 * clamp(parts.coWatch)).toFixed(
      4,
    ),
  );
}
