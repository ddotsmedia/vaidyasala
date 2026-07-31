import "server-only";

/**
 * Tiny in-memory fixed-window rate limiter for public API routes. Per-process
 * (fine for a single web replica; a Redis limiter can replace it at scale). Keyed
 * by client identifier (IP). Returns whether the request is allowed.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit = 30, windowMs = 10_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** Best-effort client IP from proxy headers (Cloudflare/standard). */
export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anon"
  );
}
