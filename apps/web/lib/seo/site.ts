import "server-only";

/** Site-wide SEO constants (§7). Host/domain values come from env (never hardcoded per CLAUDE.md). */
export const SITE = {
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  name: "Vaidyasala",
  nameMl: "വൈദ്യശാല",
  description:
    "AI-powered Malayalam health video discovery. Find trusted answers from Malayalam medical videos.",
  locale: "ml_IN",
  youtube: process.env.YOUTUBE_CHANNEL_ID
    ? `https://www.youtube.com/channel/${process.env.YOUTUBE_CHANNEL_ID}`
    : "https://www.youtube.com/@vaidyasala",
} as const;

/**
 * E-E-A-T reviewer identity (§7.3). Rendered as the "reviewed by" line and used
 * as MedicalWebPage.reviewedBy. Overridable via env once the practitioner record
 * is finalized; the default keeps the disclaimer block honest in the meantime.
 */
export const REVIEWER = {
  name: process.env.NEXT_PUBLIC_REVIEWER_NAME ?? "Vaidyasala Editorial Team",
  role: process.env.NEXT_PUBLIC_REVIEWER_ROLE ?? "Ayurveda practitioners & medical editors",
} as const;

/** Absolute URL from a site-relative path (JSON-LD @id/url must be absolute). */
export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Seconds → ISO-8601 duration (`PT#H#M#S`) for VideoObject.duration. */
export function isoDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${sec || (!h && !m) ? `${sec}S` : ""}`;
}
