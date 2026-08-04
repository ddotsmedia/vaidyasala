import { NextResponse } from "next/server";
import { validation } from "@vaidyasala/core";
import { prisma } from "@vaidyasala/db";
import { authorize } from "@/lib/authz";
import { verifyTurnstile } from "@/lib/turnstile";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/comments?videoId= — APPROVED comments for a video (§13). */
export async function GET(req: Request): Promise<NextResponse> {
  const videoId = new URL(req.url).searchParams.get("videoId");
  if (!videoId) return NextResponse.json({ comments: [] });

  const rows = await prisma.comment.findMany({
    where: { videoId, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: { id: true, name: true },
  });
  const names = new Map(users.map((u) => [u.id, u.name]));
  return NextResponse.json({
    comments: rows.map((c) => ({
      id: c.id,
      body: c.body,
      author: names.get(c.userId) ?? "Anonymous",
      parentId: c.parentId,
      createdAt: c.createdAt,
    })),
  });
}

/** POST /api/v1/comments (§13) — authed submit, defaults to PENDING moderation. */
export async function POST(req: Request): Promise<NextResponse> {
  if (!rateLimit(`comment:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const authz = await authorize("VIEWER");
  if (!authz.ok) {
    const status = authz.reason === "unauthenticated" ? 401 : 403;
    return NextResponse.json({ error: authz.reason }, { status });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = validation.commentInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", issues: parsed.error.flatten() }, { status: 422 });
  }

  const ok = await verifyTurnstile(parsed.data.turnstileToken, clientIp(req));
  if (!ok) return NextResponse.json({ error: "captcha_failed" }, { status: 400 });

  const comment = await prisma.comment.create({
    data: {
      videoId: parsed.data.videoId,
      userId: authz.ctx!.userId,
      body: parsed.data.body,
      parentId: parsed.data.parentId ?? null,
      status: "PENDING",
    },
  });
  // Held for moderation (§13): not visible until an editor approves.
  return NextResponse.json({ ok: true, id: comment.id, status: comment.status }, { status: 201 });
}
