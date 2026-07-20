import { prisma } from "@vaidyasala/db";
import { SITE, absoluteUrl } from "@/lib/seo";

export const revalidate = 1800;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cdata(s: string): string {
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

interface FeedItem {
  title: string;
  link: string;
  guid: string;
  pubDate: Date;
  contentHtml: string;
}

/**
 * Full-content RSS 2.0 feed (§7.2/§7.3): published videos (with their AI summary)
 * + articles. Also consumed by the weekly newsletter assembler.
 */
export async function GET(): Promise<Response> {
  const [videos, articles] = await Promise.all([
    prisma.video.findMany({
      where: { status: "PUBLISHED" },
      select: {
        slug: true,
        titleMl: true,
        publishedAt: true,
        createdAt: true,
        enrichment: { select: { summaryMl: true, summaryEn: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
    }),
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, titleMl: true, updatedAt: true, createdAt: true, bodyMl: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  const items: FeedItem[] = [
    ...videos.map((v) => ({
      title: v.titleMl,
      link: absoluteUrl(`/watch/${v.slug}`),
      guid: absoluteUrl(`/watch/${v.slug}`),
      pubDate: v.publishedAt ?? v.createdAt,
      contentHtml: `<p>${esc(v.enrichment?.summaryMl ?? v.titleMl)}</p>${
        v.enrichment?.summaryEn ? `<p>${esc(v.enrichment.summaryEn)}</p>` : ""
      }`,
    })),
    ...articles.map((a) => ({
      title: a.titleMl,
      link: absoluteUrl(`/articles/${a.slug}`),
      guid: absoluteUrl(`/articles/${a.slug}`),
      pubDate: a.updatedAt ?? a.createdAt,
      contentHtml: `<div>${esc(a.bodyMl.slice(0, 4000))}</div>`,
    })),
  ]
    .sort((x, y) => y.pubDate.getTime() - x.pubDate.getTime())
    .slice(0, 50);

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.name)}</title>
    <link>${SITE.url}</link>
    <description>${esc(SITE.description)}</description>
    <language>ml</language>
    <atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items
      .map(
        (it) => `<item>
      <title>${esc(it.title)}</title>
      <link>${it.link}</link>
      <guid isPermaLink="true">${it.guid}</guid>
      <pubDate>${it.pubDate.toUTCString()}</pubDate>
      <content:encoded>${cdata(it.contentHtml)}</content:encoded>
    </item>`,
      )
      .join("\n    ")}
  </channel>
</rss>`;

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, s-maxage=1800, stale-while-revalidate=86400",
    },
  });
}
