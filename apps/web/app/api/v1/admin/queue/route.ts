import { NextResponse } from "next/server";
import { authorize } from "@/lib/authz";
import { getJobSnapshot } from "@/lib/admin/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/admin/queue — snapshot of the Job mirror (§13). EDITOR+. */
export async function GET(): Promise<NextResponse> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason },
      { status: authz.reason === "unauthenticated" ? 401 : 403 },
    );
  }
  return NextResponse.json({ jobs: await getJobSnapshot() });
}
