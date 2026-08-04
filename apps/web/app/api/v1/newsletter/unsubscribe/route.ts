import { NextResponse } from "next/server";
import { prisma } from "@vaidyasala/db";
import { SITE } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/newsletter/unsubscribe?token= (§13) — one-click unsubscribe. */
export async function GET(req: Request): Promise<Response> {
  const token = new URL(req.url).searchParams.get("token");
  if (token) {
    await prisma.newsletterSubscriber
      .updateMany({ where: { token }, data: { status: "unsubscribed" } })
      .catch(() => {});
  }
  // Friendly confirmation page (no auth, no index).
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Unsubscribed · Vaidyasala</title>
<style>body{font-family:system-ui;background:#0b1220;color:#f8fafc;display:grid;place-items:center;min-height:100vh;margin:0}main{max-width:28rem;text-align:center;padding:2rem}a{color:#16a34a}</style>
</head><body><main><h1>You're unsubscribed</h1>
<p>You won't receive the Vaidyasala newsletter anymore. Changed your mind? You can resubscribe any time.</p>
<p><a href="${SITE.url}">Back to Vaidyasala →</a></p></main></body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
