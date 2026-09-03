import { Feed } from "feed";
import { prisma } from "@vaidyasala/db";

export async function GET(): Promise<Response> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vaidhyasala.com";

  const feed = new Feed({
    title: "Vaidyasala - Ayurvedic Health Education",
    description: "AI-powered Malayalam health video discovery. Find trusted answers from Malayalam medical videos.",
    id: siteUrl,
    link: siteUrl,
    language: "ml",
    favicon: `${siteUrl}/favicon.svg`,
    copyright: `© ${new Date().getFullYear()} Vaidyasala. All rights reserved.`,
    author: {
      name: "Vaidyasala",
      link: siteUrl,
    },
  });

  try {
    // Fetch all published videos, ordered by newest first
    const videos = await prisma.video.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        slug: true,
        titleMl: true,
        titleEn: true,
        description: true,
        thumbnails: true,
        youtubeId: true,
        publishedAt: true,
        updatedAt: true,
        durationSec: true,
        enrichment: {
          select: {
            summaryMl: true,
            summaryEn: true,
          },
        },
      },
      orderBy: { publishedAt: "desc" },
      take: 50, // Limit to last 50 videos for performance
    });

    for (const video of videos) {
      // Use summary if available, otherwise description
      const summary = video.enrichment?.summaryMl || video.enrichment?.summaryEn || video.description;
      const title = video.titleEn || video.titleMl || "Untitled";
      const description = summary ? summary.substring(0, 500) : "Video from Vaidyasala";

      // Get thumbnail URL
      let thumbnailUrl = `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`;
      if (video.thumbnails && typeof video.thumbnails === "object") {
        const t = video.thumbnails as Record<string, unknown>;
        for (const key of ["maxres", "standard", "high", "hq", "default"]) {
          const v = t[key];
          if (typeof v === "string") {
            thumbnailUrl = v;
            break;
          } else if (v && typeof v === "object" && typeof (v as { url?: string }).url === "string") {
            thumbnailUrl = (v as { url: string }).url;
            break;
          }
        }
      }

      feed.addItem({
        id: video.id,
        title,
        link: `${siteUrl}/watch/${video.slug}`,
        description,
        image: thumbnailUrl,
        date: video.publishedAt ? new Date(video.publishedAt) : new Date(video.updatedAt),
        content: description,
        category: [{ name: "Health" }, { name: "Ayurveda" }, { name: "Malayalam" }],
        enclosure: {
          url: `https://www.youtube.com/watch?v=${video.youtubeId}`,
          type: "video/youtube",
        },
      });
    }

    return new Response(feed.rss2(), {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating RSS feed:", error);
    return new Response("Error generating RSS feed", {
      status: 500,
    });
  }
}
