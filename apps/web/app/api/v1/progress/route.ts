import { NextResponse } from "next/server";
import { validation } from "@vaidyasala/core";
import { getResumePosition, recordProgress } from "@/lib/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/progress?videoId= — saved resume position for the current viewer. */
export async function GET(req: Request): Promise<Response> {
  const videoId = new URL(req.url).searchParams.get("videoId");
  if (!videoId) return NextResponse.json({ positionSec: 0 }, { headers: { "cache-control": "no-store" } });
  const positionSec = await getResumePosition(videoId);
  return NextResponse.json({ positionSec }, { headers: { "cache-control": "no-store" } });
}

/**
 * POST /api/v1/progress (§6.1/§13) — watch-progress beacon. Upserts WatchProgress
 * keyed by (viewerKey, videoId); viewerKey is "u:{userId}" when signed in else an
 * anonymous "a:{uuid}" cookie (§2). Beacon-friendly: accepts sendBeacon text and
 * always returns fast. Position only advances (guards against out-of-order beacons).
 */
export async function POST(req: Request): Promise<Response> {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const parsed = validation.progressInputSchema.safeParse(json);
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  await recordProgress(parsed.data);
  return new NextResponse(null, { status: 204 });
}
