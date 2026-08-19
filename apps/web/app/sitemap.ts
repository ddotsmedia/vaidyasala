import type { MetadataRoute } from "next";
import { prisma } from "@vaidyasala/db";
import { absoluteUrl } from "@/lib/seo";
import { thumbnailUrl } from "@/lib/video";

export const revalidate = 3600;

type Shard = "videos" | "articles" | "topics" | "pages";

/** Sharded sitemaps (§7.2): /sitemap/videos.xml, articles, topics, pages. */
export async function generateSitemaps(): Promise<{ id: Shard }[]> {
  return [{ id: "videos" }, { id: "articles" }, { id: "topics" }, { id: "pages" }];
}

const STATIC_PATHS = [
  "/",
  "/topics",
  "/latest",
  "/trending",
  "/playlists",
  "/subscribe",
  "/newsletter",
  "/about",
  "/privacy",
  "/terms",
];

export default async function sitemap(props: {
  id: Promise<Shard>;
}): Promise<MetadataRoute.Sitemap> {
  // Next 16 passes `id` as a Promise (like `params`) — it must be awaited.
  const id = await props.id;

  if (id === "pages") {
    return STATIC_PATHS.map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: path === "/" ? "daily" : "weekly",
      priority: path === "/" ? 1 : 0.5,
    }));
  }

  if (id === "videos") {
    const videos = await prisma.video.findMany({
      where: { status: "PUBLISHED" },
      select: {
        slug: true,
        titleMl: true,
        description: true,
        thumbnails: true,
        youtubeId: true,
        publishedAt: true,
        updatedAt: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 5000,
    });
    return videos.map((v) => {
      // thumbnail_loc must be a real raster image; the old fallback was
      // /api/og, which serves SVG and would have been rejected. thumbnailUrl()
      // walks the same stored keys and ends at a guaranteed i.ytimg JPEG.
      const thumb = thumbnailUrl(v.youtubeId, v.thumbnails);
      return {
        url: absoluteUrl(`/watch/${v.slug}`),
        lastModified: v.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        // Google video sitemap extension (§7.2).
        videos: [
          {
            title: v.titleMl,
            thumbnail_loc: thumb,
            description: (v.description ?? v.titleMl).slice(0, 2000),
            content_loc: `https://www.youtube.com/watch?v=${v.youtubeId}`,
            player_loc: `https://www.youtube-nocookie.com/embed/${v.youtubeId}`,
            publication_date: v.publishedAt?.toISOString(),
          },
        ],
      };
    });
  }

  if (id === "articles") {
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    });
    return articles.map((a) => ({
      url: absoluteUrl(`/articles/${a.slug}`),
      lastModified: a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  }

  // topics
  const topics = await prisma.topic.findMany({ select: { slug: true, updatedAt: true } });
  return topics.map((t) => ({
    url: absoluteUrl(`/topics/${t.slug}`),
    lastModified: t.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
}
