import { NextRequest, NextResponse } from 'next/server';
import { fetchChannelVideos, getVideoStats } from '@/lib/youtube';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const adminPassword = req.headers.get('x-admin-password');
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let synced = 0,
    updated = 0,
    errors: string[] = [];
  let pageToken: string | undefined;

  try {
    do {
      const { items, nextToken } = await fetchChannelVideos('UCADw8vrx5oszMLul5PHzCqA', pageToken);

      for (const item of items) {
        try {
          if (!item.id?.videoId) continue;

          const stats = await getVideoStats(item.id.videoId);
          const duration = stats?.contentDetails?.duration
            ? parseInt(stats.contentDetails.duration.match(/\d+/)?.[0] || '0')
            : 0;

          const existing = await prisma.video.findUnique({
            where: { youtubeId: item.id.videoId },
          });

          if (existing) {
            await prisma.video.update({
              where: { youtubeId: item.id.videoId },
              data: {
                viewCount: stats?.statistics?.viewCount ? parseInt(stats.statistics.viewCount as string) : 0,
                updatedAt: new Date(),
              },
            });
            updated++;
          } else {
            await prisma.video.create({
              data: {
                youtubeId: item.id.videoId,
                title: item.snippet?.title || 'Untitled',
                description: item.snippet?.description || '',
                thumbnail: item.snippet?.thumbnails?.high?.url || '',
                duration,
                uploadDate: new Date(item.snippet?.publishedAt || new Date()),
                viewCount: stats?.statistics?.viewCount ? parseInt(stats.statistics.viewCount as string) : 0,
              },
            });
            synced++;
          }
        } catch (err: any) {
          errors.push(`Failed to sync ${item.id?.videoId}: ${err.message}`);
        }
      }

      pageToken = nextToken || undefined;
    } while (pageToken);

    return NextResponse.json({ synced, updated, errors, total: synced + updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
