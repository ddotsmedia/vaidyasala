import { NextResponse } from "next/server";
import { confirm } from "@/lib/newsletter";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/newsletter/confirm?token= — double opt-in completion (§13). */
export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get("token");
  const ok = token ? await confirm(token) : false;
  const dest = new URL("/newsletter", env.NEXT_PUBLIC_SITE_URL);
  dest.searchParams.set(ok ? "confirmed" : "error", "1");
  return NextResponse.redirect(dest);
}
