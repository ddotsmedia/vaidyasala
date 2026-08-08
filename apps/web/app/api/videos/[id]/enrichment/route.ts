import { NextResponse } from "next/server";
import { prisma } from "@vaidyasala/db";

export const runtime = "nodejs";

/**
 * GET /api/videos/[id]/enrichment — AI summary, key takeaways and FAQs (§8.2).
 *
 * The watch page itself does NOT use this: it renders enrichment server-side so
 * the content is in the static HTML for SEO and first paint. This exists for
 * clients that need it separately (native shells, previews, embeds).
 *
 * `id` accepts a video id or a slug, because callers coming from a URL have the
 * slug, not the cuid.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  const video = await prisma.video.findFirst({
    where: { OR: [{ id }, { slug: id }], status: "PUBLISHED" },
    select: { id: true, slug: true, titleMl: true, titleEn: true },
  });
  if (!video) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [enrichment, faqs] = await Promise.all([
    prisma.enrichment.findUnique({
      where: { videoId: video.id },
      select: {
        summaryMl: true,
        summaryEn: true,
        keyTakeaways: true,
        modelVersion: true,
        generatedAt: true,
      },
    }),
    prisma.faq.findMany({
      where: { videoId: video.id },
      select: { questionMl: true, answerMl: true, questionEn: true, answerEn: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json(
    {
      videoId: video.id,
      slug: video.slug,
      titleMl: video.titleMl,
      titleEn: video.titleEn,
      summaryMl: enrichment?.summaryMl ?? null,
      summaryEn: enrichment?.summaryEn ?? null,
      keyTakeaways: enrichment?.keyTakeaways ?? [],
      faqs,
      modelVersion: enrichment?.modelVersion ?? null,
      generatedAt: enrichment?.generatedAt ?? null,
    },
    {
      // Enrichment only changes when the pipeline re-runs, so it caches like the
      // page it belongs to.
      headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    },
  );
}
