import { NextResponse } from "next/server";
import { z } from "zod";
import { listTopics } from "@/lib/feeds";

export const runtime = "nodejs";

const querySchema = z.object({
  includeVideoCount: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  /** Drop categories with no published videos. */
  nonEmpty: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

/**
 * GET /api/categories?includeVideoCount=true — health topics (§13).
 *
 * "Category" is this API's public name for the `Topic` model; the schema has no
 * separate Category table and adding one would split the same concept in two.
 */
export async function GET(req: Request): Promise<Response> {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid query", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { includeVideoCount, nonEmpty } = parsed.data;

  const topics = await listTopics();
  const filtered = nonEmpty ? topics.filter((t) => t.videoCount > 0) : topics;

  const categories = filtered.map((t) =>
    includeVideoCount
      ? t
      : { slug: t.slug, nameMl: t.nameMl, nameEn: t.nameEn, kind: t.kind },
  );

  return NextResponse.json(
    { count: categories.length, categories },
    { headers: { "cache-control": "public, s-maxage=1800, stale-while-revalidate=86400" } },
  );
}
