import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/** robots.txt (§7.2): index public pages, keep admin/api out; point at sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/login", "/continue", "/watchlist"],
      },
    ],
    sitemap: [
      `${SITE.url}/sitemap/videos.xml`,
      `${SITE.url}/sitemap/articles.xml`,
      `${SITE.url}/sitemap/topics.xml`,
      `${SITE.url}/sitemap/pages.xml`,
    ],
    host: SITE.url,
  };
}
