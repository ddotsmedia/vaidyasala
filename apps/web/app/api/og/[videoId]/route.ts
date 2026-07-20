import { prisma } from "@vaidyasala/db";
import { buildOgSvg } from "@vaidyasala/core/seo";

/**
 * Branded OG card (§7.1). Accepts a video id OR slug so pages can point at
 * /api/og/{slug} without a second lookup. On-the-fly SVG (dependency-free);
 * Phase 3D serves the worker-rendered PNG from storage. Cached at the edge.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ videoId: string }> },
): Promise<Response> {
  const { videoId } = await params;
  const video = await prisma.video.findFirst({
    where: { OR: [{ id: videoId }, { slug: videoId }] },
    select: { titleMl: true, primaryTopic: { select: { nameMl: true } } },
  });

  const svg = buildOgSvg({
    titleMl: video?.titleMl ?? "വൈദ്യശാല",
    badgeMl: video?.primaryTopic?.nameMl,
  });

  return new Response(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
