import { NextResponse } from "next/server";
import { getFallbackTopics, getPopularSearches } from "@/lib/search-suggest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/search/suggestions — what to show in an empty search box (§7.6).
 *
 * Popular past searches plus the largest topics, so the palette is useful before
 * a single character is typed. Cached briefly at the edge: this is identical for
 * every visitor and changes on the scale of hours, not requests.
 */
export async function GET(): Promise<Response> {
  const [popular, topics] = await Promise.all([getPopularSearches(6), getFallbackTopics(6)]);
  return NextResponse.json(
    { popular, topics },
    { headers: { "cache-control": "public, s-maxage=600, stale-while-revalidate=3600" } },
  );
}
