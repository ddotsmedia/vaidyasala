import { prisma } from '@/lib/db';

export default async function sitemap() {
  const videos = await prisma.video.findMany({
    select: { youtubeId: true, updatedAt: true },
  });

  const articles = await prisma.article.findMany({
    select: { slug: true, updatedAt: true },
  });

  const videoUrls = videos.map(v => ({
    url: `https://vaidyasala.com/videos/${v.youtubeId}`,
    lastModified: v.updatedAt,
    priority: 0.8,
  }));

  const articleUrls = articles.map(a => ({
    url: `https://vaidyasala.com/blog/${a.slug}`,
    lastModified: a.updatedAt,
    priority: 0.6,
  }));

  return [{ url: 'https://vaidyasala.com', lastModified: new Date(), priority: 1 }, ...videoUrls, ...articleUrls];
}
