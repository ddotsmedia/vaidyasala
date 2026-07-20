/**
 * Pure SEO helpers shared by apps/web (serves /api/og) and apps/worker (renders
 * og-image to storage on publish, §9.2). No React/next/bullmq here (§3).
 */

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wrap a title into ≤`maxLines` lines of ≤`perLine` chars for the OG card. */
export function wrapTitle(title: string, perLine = 22, maxLines = 3): string[] {
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > perLine && cur) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = `${cur} ${w}`.trim();
    }
    if (lines.length === maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur.trim());
  return lines.slice(0, maxLines);
}

export interface OgCardInput {
  titleMl: string;
  badgeMl?: string;
}

/**
 * Self-contained 1200×630 OG card SVG (§7.1). Dependency-free — Phase 3D swaps
 * this for Satori→PNG with the Anek Malayalam font (see DECISIONS.md).
 */
export function buildOgSvg({ titleMl, badgeMl }: OgCardInput): string {
  const lines = wrapTitle(titleMl);
  const tspans = lines
    .map((l, i) => `<tspan x="80" dy="${i === 0 ? 0 : 84}">${escapeXml(l)}</tspan>`)
    .join("");
  const badge = escapeXml(badgeMl ?? "വൈദ്യശാല");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0b1220"/>
  <rect x="0" y="0" width="1200" height="10" fill="#16a34a"/>
  <text x="80" y="120" font-family="sans-serif" font-size="34" fill="#16a34a">${badge}</text>
  <text x="80" y="300" font-family="sans-serif" font-size="72" font-weight="700" fill="#f8fafc">${tspans}</text>
  <text x="80" y="560" font-family="sans-serif" font-size="30" fill="#94a3b8">vaidyasala.live</text>
</svg>`;
}
