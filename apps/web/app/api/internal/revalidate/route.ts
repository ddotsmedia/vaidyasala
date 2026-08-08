import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/internal/revalidate — force-regenerate the DB-backed listing pages.
 *
 * Needed because an image built WITHOUT a reachable database prerenders those
 * pages empty (see @vaidyasala/db build-guard). They would otherwise keep
 * serving that empty HTML until their revalidate window elapsed — up to 30
 * minutes of a blank-looking site after a deploy. The deploy job calls this
 * once the container is healthy.
 *
 * Harmless to call on an image that was built with a database: it just
 * regenerates pages that were already correct.
 *
 * Auth: REVALIDATE_TOKEN, falling back to ADMIN_INGEST_TOKEN so an existing
 * deployment does not need a new secret. No token configured ⇒ 503 rather than
 * an open endpoint.
 */
const PATHS = ["/", "/latest", "/trending", "/topics", "/playlists", "/articles"];

export async function POST(req: Request): Promise<Response> {
  const expected = process.env.REVALIDATE_TOKEN ?? process.env.ADMIN_INGEST_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "revalidation not configured (set REVALIDATE_TOKEN)" },
      { status: 503 },
    );
  }

  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-revalidate-token") ??
    "";
  if (provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  for (const path of PATHS) revalidatePath(path);
  // Slug pages regenerate on their own next request; only the listings bake in
  // a "there is nothing here" view that would mislead a visitor.
  return NextResponse.json({ revalidated: PATHS }, { headers: { "cache-control": "no-store" } });
}
