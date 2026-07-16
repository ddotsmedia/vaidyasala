import { NextResponse } from "next/server";
import { ingestInputSchema } from "@vaidyasala/core/queue";
import { authorizeAdmin } from "@/lib/rbac";
import { enqueueIngest } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/videos/ingest — manual/backfill ingest (§13, §9.1).
 * RBAC-stubbed (2D wires Better Auth); Zod-validated; enqueues an ingest job.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const authz = authorizeAdmin(req);
  if (!authz.ok) {
    return NextResponse.json({ error: "forbidden", reason: authz.reason }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = ingestInputSchema.safeParse({ ...(json as object), source: "manual" });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const jobId = await enqueueIngest(parsed.data);
  return NextResponse.json(
    { ok: true, jobId, youtubeId: parsed.data.youtubeId },
    { status: 202 },
  );
}
