/** One run of text, flagged as a query match or not. */
export interface TextRun {
  text: string;
  match: boolean;
}

/**
 * Split `text` into alternating matched and unmatched runs.
 *
 * Case-insensitive, and deliberately literal: a Manglish query transliterated
 * from Malayalam will not substring-match the Malayalam title, and in that case
 * this returns one unmatched run rather than guessing at an alignment. The
 * result underlines what the viewer typed, never what the ranker inferred.
 *
 * Matching is done on the lowercased copy but every slice is taken from the
 * original, so Malayalam is never re-cased on the way out.
 */
export function splitMatches(text: string, query: string): TextRun[] {
  const needle = query.trim();
  // An empty needle matches at every index; without this guard the scan below
  // never advances.
  if (!needle) return [{ text, match: false }];

  const hay = text.toLocaleLowerCase();
  const find = needle.toLocaleLowerCase();
  // Locale lowercasing can change length (Turkish dotted I expands to two code
  // units). Slicing the original by the needle's length would then drift, so
  // fall back to no highlighting rather than mangle the text.
  if (hay.length !== text.length || find.length !== needle.length) {
    return [{ text, match: false }];
  }

  const runs: TextRun[] = [];
  let from = 0;
  for (;;) {
    const at = hay.indexOf(find, from);
    if (at === -1) break;
    if (at > from) runs.push({ text: text.slice(from, at), match: false });
    runs.push({ text: text.slice(at, at + needle.length), match: true });
    from = at + needle.length;
  }

  if (runs.length === 0) return [{ text, match: false }];
  if (from < text.length) runs.push({ text: text.slice(from), match: false });
  return runs;
}
