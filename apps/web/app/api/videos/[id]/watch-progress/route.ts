import { NextResponse } from "next/server";
import { validation } from "@vaidyasala/core";
import { getResumePosition, recordProgress } from "@/lib/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" } as const;

/**
 * Per-video watch progress. Shares its write path with the sendBeacon endpoint
 * at /api/v1/progress via `recordProgress` — this route is the addressable,
 * JSON-returning form (the beacon endpoint answers 204 and cannot return state).
 */

/** GET /api/videos/[id]/watch-progress — where to resume this video. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const positionSec = await getResumePosition(id);
  return NextResponse.json({ videoId: id, positionSec }, { headers: noStore });
}

/** POST /api/videos/[id]/watch-progress — save position / percent watched. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400, headers: noStore });
  }

  // The id comes from the path here, so it is not required in the body.
  const parsed = validation.progressInputSchema
    .omit({ videoId: true })
    .safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400, headers: noStore });
  }

  const saved = await recordProgress({ videoId: id, ...parsed.data });
  if (!saved) {
    return NextResponse.json({ error: "no viewer" }, { status: 400, headers: noStore });
  }
  return NextResponse.json({ videoId: id, ...saved }, { headers: noStore });
}
