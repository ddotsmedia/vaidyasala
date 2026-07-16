import { NextResponse } from "next/server";
import { ingestInputSchema } from "@vaidyasala/core/queue";
import { authorize } from "@/lib/authz";
import { enqueueIngest } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/admin/videos/ingest — manual/backfill ingest (§13, §9.1).
 * RBAC: EDITOR+ (§10 authorize layer); Zod-validated; enqueues an ingest job.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) {
    const status = authz.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json({ error: authz.reason }, { status });
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
