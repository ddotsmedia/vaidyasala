import { NextResponse } from "next/server";
import { z } from "zod";
import { getLatest, getTrending } from "@/lib/feeds";

export const runtime = "nodejs";

const querySchema = z.object({
  sortBy: z.enum(["latest", "trending"]).default("latest"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  /** Trending window in days. Only meaningful with sortBy=trending. */
  days: z.coerce.number().int().min(1).max(90).default(7),
});

/**
 * GET /api/videos?sortBy=latest|trending&limit=20 — public discovery feed (§13).
 *
 * Reuses lib/feeds so the API and the home page cannot disagree about what
 * "trending" means: plays recorded in the last N days, falling back to catalogue
 * order on a cold start with no events yet.
 */
export async function GET(req: Request): Promise<Response> {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid query", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { sortBy, limit, days } = parsed.data;

  const videos =
    sortBy === "trending" ? await getTrending(limit, days) : await getLatest(limit);

  return NextResponse.json(
    { sortBy, limit, count: videos.length, videos },
    {
      headers: {
        // Trending moves with engagement, latest only on publish — so trending
        // gets the shorter window.
        "cache-control":
          sortBy === "trending"
            ? "public, s-maxage=300, stale-while-revalidate=1800"
            : "public, s-maxage=1800, stale-while-revalidate=86400",
      },
    },
  );
}
