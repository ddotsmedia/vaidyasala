import { NextResponse } from "next/server";
import { validation } from "@vaidyasala/core";
import { prisma } from "@vaidyasala/db";
import { searchWithManglish } from "@/lib/search";
import { getFallbackTopics } from "@/lib/search-suggest";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/search?q=&limit= (§13/§14). Zod-validated, rate-limited, grouped
 * instant results across videos/articles/topics/faqs. Every query is logged to
 * SearchQueryLog with detected script — zero-result queries become content-gap
 * signals + manglish training data (§7.6/§14).
 */
export async function GET(req: Request): Promise<NextResponse> {
  if (!rateLimit(`search:${clientIp(req)}`, 30, 10_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const url = new URL(req.url);
  const parsed = validation.searchQuerySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    limit: url.searchParams.get("limit") ?? undefined,
    duration: url.searchParams.get("duration") ?? undefined,
    date: url.searchParams.get("date") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    topicSlug: url.searchParams.get("topicSlug") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", issues: parsed.error.flatten() }, { status: 422 });
  }
  const { q, limit, duration, date, sort, topicSlug } = parsed.data;

  const results = await searchWithManglish(q, limit, { duration, date, sort, topicSlug });

  // A dead end is the one result worth enriching: offer somewhere to go next.
  const fallbackTopics = results.total === 0 ? await getFallbackTopics() : [];

  // Fire-and-forget query log (never block the response).
  void prisma.searchQueryLog
    .create({ data: { query: q, script: results.script, results: results.total } })
    .catch(() => {});

  return NextResponse.json(
    { ...results, fallbackTopics },
    { headers: { "cache-control": "no-store" } },
  );
}
