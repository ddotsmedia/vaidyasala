import { NextResponse } from "next/server";
import { validation } from "@vaidyasala/core";
import { prisma } from "@vaidyasala/db";
import { getViewerKey } from "@/lib/viewer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store" } as const;

/** GET /api/videos/[id]/reaction — this viewer's like/bookmark state. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  // Do not mint a cookie just to answer a read — an unknown viewer has no
  // reactions, and minting here would set a cookie on every static page visit.
  const { key } = await getViewerKey(false);
  if (!key) {
    return NextResponse.json({ liked: false, bookmarked: false }, { headers: noStore });
  }
  const row = await prisma.videoReaction.findUnique({
    where: { viewerKey_videoId: { viewerKey: key, videoId: id } },
  });
  return NextResponse.json(
    { liked: row?.liked ?? false, bookmarked: row?.bookmarked ?? false },
    { headers: noStore },
  );
}

/**
 * POST /api/videos/[id]/reaction — set like and/or bookmark. Fields are optional
 * and only what is sent gets changed, so the two buttons never clobber each other.
 */
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
  const parsed = validation.reactionInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400, headers: noStore });
  }
  const { liked, bookmarked } = parsed.data;
  if (liked === undefined && bookmarked === undefined) {
    return NextResponse.json({ error: "nothing to set" }, { status: 400, headers: noStore });
  }

  const { key, userId } = await getViewerKey(true);
  if (!key) {
    return NextResponse.json({ error: "no viewer" }, { status: 400, headers: noStore });
  }

  const row = await prisma.videoReaction.upsert({
    where: { viewerKey_videoId: { viewerKey: key, videoId: id } },
    create: {
      viewerKey: key,
      userId,
      videoId: id,
      liked: liked ?? false,
      bookmarked: bookmarked ?? false,
    },
    update: {
      ...(liked === undefined ? {} : { liked }),
      ...(bookmarked === undefined ? {} : { bookmarked }),
      userId,
    },
  });

  return NextResponse.json(
    { liked: row.liked, bookmarked: row.bookmarked },
    { headers: noStore },
  );
}
