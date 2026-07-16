import type { PrismaClient } from "@vaidyasala/db";
import type { StoragePort } from "../storage/s3";

export interface OgImageDeps {
  prisma: PrismaClient;
  storage: StoragePort;
  log?: (msg: string) => void;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wrap a Malayalam/English title into ≤3 lines for the OG card. */
function wrap(title: string, perLine = 22, maxLines = 3): string[] {
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

/**
 * OG image (§8.2 / §9.2 publish fan-out). Renders a self-contained 1200×630 SVG
 * card for the video and stores it. (Phase 3D upgrades this to Satori→PNG with
 * the Anek Malayalam font; SVG here keeps it dependency-free and runnable now —
 * see DECISIONS.md.)
 */
export function createOgImageProcessor(deps: OgImageDeps) {
  const log = deps.log ?? (() => {});
  return async function renderOgImage(videoId: string): Promise<{ key: string; url?: string }> {
    const video = await deps.prisma.video.findUnique({
      where: { id: videoId },
      select: { youtubeId: true, titleMl: true, primaryTopic: { select: { nameMl: true } } },
    });
    if (!video) throw new Error(`og-image: no video ${videoId}`);

    const lines = wrap(video.titleMl);
    const tspans = lines
      .map((l, i) => `<tspan x="80" dy="${i === 0 ? 0 : 84}">${escapeXml(l)}</tspan>`)
      .join("");
    const badge = escapeXml(video.primaryTopic?.nameMl ?? "വൈദ്യശാല");

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0b1220"/>
  <rect x="0" y="0" width="1200" height="10" fill="#16a34a"/>
  <text x="80" y="120" font-family="sans-serif" font-size="34" fill="#16a34a">${badge}</text>
  <text x="80" y="300" font-family="sans-serif" font-size="72" font-weight="700" fill="#f8fafc">${tspans}</text>
  <text x="80" y="560" font-family="sans-serif" font-size="30" fill="#94a3b8">vaidyasala.live</text>
</svg>`;

    const key = `videos/${video.youtubeId}/og.svg`;
    if (!deps.storage.enabled) {
      log(`[og-image] ${videoId} storage disabled — skip`);
      return { key };
    }
    const res = await deps.storage.put(key, new TextEncoder().encode(svg), "image/svg+xml");
    log(`[og-image] ${videoId} rendered → ${res.key}`);
    return res;
  };
}
