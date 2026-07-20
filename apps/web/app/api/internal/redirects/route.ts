import { NextResponse } from "next/server";
import { prisma } from "@vaidyasala/db";

export const runtime = "nodejs";
// Always read the live table: middleware caches the map in-process for 5 min and
// the CDN honours s-maxage, so a new Redirect row takes effect promptly without
// being pinned to a build-time snapshot.
export const dynamic = "force-dynamic";

/**
 * Internal-only: the Redirect table as a `{ from: {to, code} }` map, consumed by
 * middleware (which can't reach Prisma on the edge). Cached 5 min; small by
 * design. Not linked anywhere and disallowed in robots.
 */
export async function GET(): Promise<NextResponse> {
  const rows = await prisma.redirect.findMany({ select: { from: true, to: true, code: true } });
  const map: Record<string, { to: string; code: number }> = {};
  for (const r of rows) map[r.from] = { to: r.to, code: r.code };
  return NextResponse.json(map, {
    headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
