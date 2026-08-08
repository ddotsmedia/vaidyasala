import { NextResponse } from "next/server";
import { getContinueWatching } from "@/lib/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/continue — the viewer's in-progress videos (§6.3).
 *
 * Exists so the home page can stay statically rendered: reading the viewer
 * cookie during the page render would opt the whole route out of ISR, so the
 * personalization is fetched after hydration instead (same approach as the
 * watch page's resume position).
 */
export async function GET(): Promise<Response> {
  const items = await getContinueWatching(12);
  return NextResponse.json({ items }, { headers: { "cache-control": "no-store" } });
}
