import { NextResponse } from "next/server";
import { newsletterSubscribeSchema } from "@vaidyasala/core/validation";
import { subscribe } from "@/lib/newsletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/v1/newsletter/subscribe — double opt-in start (§13). */
export async function POST(req: Request): Promise<NextResponse> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = newsletterSubscribeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid email" }, { status: 422 });
  }
  await subscribe(parsed.data.email);
  return NextResponse.json({ ok: true }, { status: 202 });
}
