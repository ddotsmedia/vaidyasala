import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import { NextResponse } from "next/server";
import { parseYouTubeId } from "@vaidyasala/core/queue";
import { env } from "@/lib/env";
import { enqueueIngest } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — WebSub/PubSubHubbub verification (§9.1). The hub echoes a challenge on
 * (un)subscribe; we return it verbatim iff hub.mode is valid and (when a verify
 * token is configured) hub.verify_token matches.
 */
export function GET(req: Request): Response {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = url.searchParams.get("hub.verify_token");

  if ((mode !== "subscribe" && mode !== "unsubscribe") || !challenge) {
    return new NextResponse("bad request", { status: 400 });
  }
  if (env.WEBSUB_VERIFY_TOKEN && verifyToken !== env.WEBSUB_VERIFY_TOKEN) {
    return new NextResponse("forbidden", { status: 403 });
  }
  return new NextResponse(challenge, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

/** Constant-time compare of the `sha1=<hex>` X-Hub-Signature header. */
function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = "sha1=" + createHmac("sha1", secret).update(rawBody).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST — Atom push notification of a new/updated upload (§9.1). HMAC-verified,
 * then the yt:videoId is extracted and an ingest job enqueued.
 */
export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();

  if (env.WEBSUB_SECRET) {
    if (!verifySignature(raw, req.headers.get("x-hub-signature"), env.WEBSUB_SECRET)) {
      return new NextResponse("invalid signature", { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // BLOCKED: WEBSUB_SECRET unset — refuse unverified pushes in production.
    return new NextResponse("webhook secret not configured", { status: 503 });
  }

  const match = /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(raw);
  const youtubeId = match ? parseYouTubeId(match[1]!.trim()) : null;
  if (!youtubeId) {
    // Feed pings without a videoId (e.g. deletions) — acknowledge, nothing to do.
    return new NextResponse(null, { status: 204 });
  }

  await enqueueIngest({ youtubeId, source: "websub" });
  return new NextResponse(null, { status: 204 });
}
