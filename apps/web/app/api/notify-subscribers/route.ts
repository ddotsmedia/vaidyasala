import { NextRequest, NextResponse } from "next/server";
import { getVideoBySlug } from "@/lib/video";
import { sendNewVideoNotification } from "@/lib/email-notifications";

export const dynamic = "force-dynamic";

/**
 * POST /api/notify-subscribers
 *
 * Send new video notification to all newsletter subscribers.
 * This is an admin endpoint - in production, it should check auth.
 *
 * Body: { videoId: string } or { slug: string }
 *
 * Returns: { sent: number, videoId: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // BLOCKED: Auth check required - currently no auth enforcement
    // In production: verify user is admin before proceeding

    const body = await request.json();
    const { videoId, slug } = body as { videoId?: string; slug?: string };

    if (!videoId && !slug) {
      return NextResponse.json({ error: "videoId or slug required" }, { status: 400 });
    }

    // Fetch video data
    let video;
    if (slug) {
      video = await getVideoBySlug(slug);
      if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 });
      }
    } else {
      // If only videoId provided, we'd need a different query
      // For now, require slug
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    // Send notifications
    const sent = await sendNewVideoNotification({
      videoId: video.id,
      titleMl: video.titleMl,
      titleEn: video.titleEn || undefined,
      slugs: video.slug,
      description: video.summaryMl || video.description || undefined,
      thumbnailUrl: video.thumbnailUrl,
    });

    return NextResponse.json(
      {
        sent,
        videoId: video.id,
        title: video.titleMl,
        message: `Notification sent to ${sent} subscribers`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Notify subscribers error:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}
