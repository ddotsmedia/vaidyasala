import { NextResponse } from "next/server";
import { CORE_VERSION } from "@vaidyasala/core";

export const dynamic = "force-dynamic";

/** Liveness probe used by compose healthchecks and the deploy smoke test (§11). */
export function GET() {
  return NextResponse.json({ status: "ok", core: CORE_VERSION });
}
