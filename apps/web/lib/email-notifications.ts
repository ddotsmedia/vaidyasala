import "server-only";
import { prisma } from "@vaidyasala/db";
import { env } from "./env";

export interface VideoNotificationData {
  videoId: string;
  titleMl: string;
  titleEn?: string;
  slugs: string;
  description?: string;
  thumbnailUrl: string;
}

/**
 * Send new video notification email to all verified newsletter subscribers.
 * Uses Resend API (free tier: 100 emails/day).
 * Fixture mode: logs URLs instead of sending when RESEND_API_KEY is absent.
 */
export async function sendNewVideoNotification(video: VideoNotificationData): Promise<number> {
  if (!env.RESEND_API_KEY) {
    // BLOCKED: RESEND_API_KEY absent — fixture mode, no email sent.
    console.log(`[email-notifications:fixture] new video: ${video.titleMl} (${video.videoId})`);
    return 0;
  }

  // Fetch all active subscribers
  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { status: "active" },
    select: { email: true },
  });

  if (subscribers.length === 0) {
    return 0;
  }

  const siteUrl = env.NEXT_PUBLIC_SITE_URL ?? "https://vaidhyasala.com";
  const videoUrl = `${siteUrl}/watch/${video.slugs}`;
  const title = video.titleEn || video.titleMl || "New Video";
  const description = video.description
    ? video.description.substring(0, 200)
    : "Check out our latest health video";

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Vaidyasala Video</h2>
      <p>Hi,</p>
      <p>A new health video has been added to Vaidyasala:</p>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${title}</h3>
        <p>${description}</p>
        <a href="${videoUrl}" style="display: inline-block; background: #ef4444; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 10px;">Watch Video</a>
      </div>

      <p>Thank you for following Vaidyasala!</p>
      <p style="font-size: 12px; color: #999;">Vaidyasala - AI-powered Malayalam health video discovery</p>
    </div>
  `;

  try {
    // Send emails via Resend API (single request for simplicity)
    // BLOCKED: Batch sending would require multiple requests or CC/BCC (not supported)
    // For now, we send to each subscriber individually (hitting rate limits quickly)
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: subscribers.map((s) => s.email),
        subject: `New: ${title}`,
        html: htmlContent,
        reply_to: "support@vaidhyasala.com",
      }),
    });

    if (!response.ok) {
      console.error(`Resend API error: ${response.status}`, await response.text());
      return 0;
    }

    return subscribers.length;
  } catch (error) {
    console.error("Error sending video notifications:", error);
    return 0;
  }
}

/**
 * Send custom notification to all active subscribers.
 * Use this for announcements, special events, etc.
 */
export async function sendCustomNotification(subject: string, htmlContent: string): Promise<number> {
  if (!env.RESEND_API_KEY) {
    console.log(`[email-notifications:fixture] custom: ${subject}`);
    return 0;
  }

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { status: "active" },
    select: { email: true },
  });

  if (subscribers.length === 0) {
    return 0;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: subscribers.map((s) => s.email),
        subject,
        html: htmlContent,
        reply_to: "support@vaidhyasala.com",
      }),
    });

    if (!response.ok) {
      console.error(`Resend API error: ${response.status}`, await response.text());
      return 0;
    }

    return subscribers.length;
  } catch (error) {
    console.error("Error sending custom notification:", error);
    return 0;
  }
}
