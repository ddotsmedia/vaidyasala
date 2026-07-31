import { NextResponse } from "next/server";
import { validation } from "@vaidyasala/core";
import { classifyScript } from "@vaidyasala/core/search";
import { prisma } from "@vaidyasala/db";
import { searchClient } from "@/lib/search";
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
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", issues: parsed.error.flatten() }, { status: 422 });
  }
  const { q, limit } = parsed.data;

  const results = searchClient
    ? await searchClient.search(q, limit)
    : { script: classifyScript(q), groups: [], total: 0 };

  // Fire-and-forget query log (never block the response).
  void prisma.searchQueryLog
    .create({ data: { query: q, script: results.script, results: results.total } })
    .catch(() => {});

  return NextResponse.json(results, {
    headers: { "cache-control": "no-store" },
  });
}
