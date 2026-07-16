import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { validation } from "@vaidyasala/core";
import { prisma, type Prisma } from "@vaidyasala/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIEWER_COOKIE = "vaid_vk";

/**
 * POST /api/v1/events — funnel analytics ingest (§13, §6.1). Zod-validated;
 * writes an AnalyticsEvent keyed by an anonymous viewerKey cookie ("a:{uuid}",
 * §2). Beacon-friendly: always returns 204 quickly.
 */
export async function POST(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const parsed = validation.analyticsEventSchema.safeParse(json);
  if (!parsed.success) return new NextResponse(null, { status: 204 });

  const jar = await cookies();
  let viewerKey = jar.get(VIEWER_COOKIE)?.value;
  if (!viewerKey) {
    viewerKey = `a:${randomUUID()}`;
    jar.set(VIEWER_COOKIE, viewerKey, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  await prisma.analyticsEvent.create({
    data: {
      name: parsed.data.name,
      videoId: parsed.data.videoId ?? null,
      viewerKey,
      props: (parsed.data.props ?? {}) as Prisma.InputJsonValue,
    },
  });
  return new NextResponse(null, { status: 204 });
}
