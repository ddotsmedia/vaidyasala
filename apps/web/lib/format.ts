/**
 * Format utilities for display values
 */

/**
 * Format duration in seconds to MM:SS or H:MM:SS format.
 * @param seconds - Total duration in seconds
 * @returns Formatted duration string
 * @example formatDuration(3661) => "1:01:01"
 * @example formatDuration(125) => "2:05"
 */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return h > 0 ? `${h}:${mm}:${String(sec).padStart(2, "0")}` : `${mm}:${String(sec).padStart(2, "0")}`;
}

/**
 * Format view count to compact notation (1.2M, 500K, etc).
 * @param views - Total view count
 * @returns Formatted view count string
 * @example formatViews(1200000) => "1.2M"
 * @example formatViews(500000) => "500K"
 * @example formatViews(1234) => "1.2K"
 */
export function formatViews(views: number): string {
  const n = Math.max(0, Math.floor(views));

  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return m.toFixed(m < 10 ? 1 : 0) + "M";
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return k.toFixed(k < 10 ? 1 : 0) + "K";
  }
  return String(n);
}

/**
 * Format date to relative time (e.g., "2 days ago").
 * Falls back to absolute date if older than 6 months.
 * @param date - The date to format (undefined returns empty string)
 * @returns Formatted date string
 * @example formatDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)) => "2 days ago"
 * @example formatDate(new Date(Date.now() - 60 * 1000)) => "1 minute ago"
 */
export function formatDate(date?: Date | null): string {
  if (!date) return "";

  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
  if (diffWeek < 4) return `${diffWeek} week${diffWeek !== 1 ? "s" : ""} ago`;
  if (diffMonth < 6) return `${diffMonth} month${diffMonth !== 1 ? "s" : ""} ago`;

  // Fallback to absolute date for older posts
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
