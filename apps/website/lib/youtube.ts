import { google } from 'googleapis';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY || 'AIzaSyA3SVk-gYWASnuP1ItyjI9UJgJSpSpQSv0',
});

export async function fetchChannelVideos(channelId: string, pageToken?: string) {
  const response = await youtube.search.list({
    part: ['snippet'],
    channelId,
    type: 'video',
    maxResults: 50,
    order: 'date',
    pageToken,
  } as any);
  return { items: response.data.items || [], nextToken: response.data.nextPageToken };
}

export async function getVideoStats(videoId: string) {
  const response = await youtube.videos.list({
    part: ['statistics', 'contentDetails'],
    id: [videoId],
  } as any);
  return response.data.items?.[0];
}
