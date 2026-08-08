import { NextResponse } from "next/server";
import { z } from "zod";
import { getTopicBySlug } from "@/lib/feeds";
import { browse, DURATIONS, PAGE_SIZE, SORTS } from "@/lib/topic-browse";

export const runtime = "nodejs";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  sort: z.enum(SORTS).default("latest"),
  duration: z.enum(DURATIONS).default("all"),
  pageSize: z.coerce.number().int().min(1).max(48).default(PAGE_SIZE),
});

/**
 * GET /api/categories/[slug]/videos?page=1&sort=latest — a topic's videos (§13).
 *
 * Sorting, filtering and paging come from lib/topic-browse, the same module the
 * page's client controls use, so the API and the UI cannot disagree about what
 * "short" or "trending" means.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid query", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const topic = await getTopicBySlug(slug);
  if (!topic) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { page, sort, duration, pageSize } = parsed.data;
  const result = browse(topic.videos, { page, sort, duration, pageSize });

  return NextResponse.json(
    {
      topic: { slug: topic.slug, nameMl: topic.nameMl, nameEn: topic.nameEn },
      sort,
      duration,
      page: result.page,
      pageCount: result.pageCount,
      total: result.total,
      videos: result.items,
    },
    {
      headers: {
        // Trending shifts with engagement; the rest only on publish.
        "cache-control":
          sort === "trending"
            ? "public, s-maxage=300, stale-while-revalidate=1800"
            : "public, s-maxage=1800, stale-while-revalidate=86400",
      },
    },
  );
}
