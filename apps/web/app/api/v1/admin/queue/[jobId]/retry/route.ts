import { NextResponse } from "next/server";
import { prisma } from "@vaidyasala/db";
import { authorize } from "@/lib/authz";
import { retryJob } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/v1/admin/queue/:jobId/retry — requeue a failed/DLQ job (§13). EDITOR+. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason },
      { status: authz.reason === "unauthenticated" ? 401 : 403 },
    );
  }
  const { jobId } = await params;
  const mirror = await prisma.job.findUnique({ where: { id: jobId } });
  if (!mirror) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ok = await retryJob(jobId, mirror.kind);
  if (!ok) return NextResponse.json({ error: "job not present in queue" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
