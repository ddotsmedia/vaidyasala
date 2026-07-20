import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware (§7.2):
 *  1. Redirect table → 301 (zero link-rot). The table lives in Postgres, which
 *     the edge can't reach directly, so it's fetched from an internal nodejs
 *     route and cached in-process (best-effort; fail-open on any error).
 *  2. Canonicalization → strip `?t=` and tracking params, 301 to the clean URL.
 */

const STRIP_PARAMS = [
  "t",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "si",
];

type RedirectMap = Record<string, { to: string; code: number }>;
let cache: { at: number; map: RedirectMap } | null = null;
const TTL_MS = 300_000;

async function getRedirects(origin: string): Promise<RedirectMap> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  try {
    const res = await fetch(`${origin}/api/internal/redirects`, { cache: "no-store" });
    if (res.ok) {
      const map = (await res.json()) as RedirectMap;
      cache = { at: Date.now(), map };
      return map;
    }
  } catch {
    /* fail-open — never block a request on the redirect lookup */
  }
  return cache?.map ?? {};
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const url = req.nextUrl;

  // 1. Redirect table (exact path match).
  const map = await getRedirects(url.origin);
  const hit = map[url.pathname];
  if (hit) {
    const dest = new URL(hit.to, url.origin);
    return NextResponse.redirect(dest, hit.code === 302 ? 302 : 301);
  }

  // 2. Strip tracking params → canonical URL.
  let changed = false;
  for (const p of STRIP_PARAMS) {
    if (url.searchParams.has(p)) {
      url.searchParams.delete(p);
      changed = true;
    }
  }
  if (changed) return NextResponse.redirect(url, 301);

  return NextResponse.next();
}

/** Skip _next internals, api routes, and files with an extension. */
export const config = {
  matcher: ["/((?!_next/|api/|.*\\.[^/]+$).*)"],
};
