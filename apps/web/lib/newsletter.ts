import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@vaidyasala/db";
import { env } from "./env";

/**
 * Send the double opt-in confirmation email via Resend. Fixture mode when no
 * RESEND_API_KEY (§3B): logs the confirm URL instead of sending, so the flow is
 * exercisable without a key.
 */
async function sendConfirmation(email: string, confirmUrl: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    // BLOCKED: RESEND_API_KEY absent — fixture mode, no email sent.
    console.log(`[newsletter:fixture] confirm ${email} → ${confirmUrl}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: email,
      subject: "Confirm your Vaidyasala subscription",
      html: `<p>Confirm your subscription to the Vaidyasala weekly digest:</p><p><a href="${confirmUrl}">Confirm subscription</a></p>`,
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
}

/** Create/refresh a pending subscriber and send the confirmation email. */
export async function subscribe(email: string): Promise<void> {
  const token = randomUUID();
  await prisma.newsletterSubscriber.upsert({
    where: { email },
    update: { token, status: "pending" },
    create: { email, token, status: "pending" },
  });
  const confirmUrl = `${env.NEXT_PUBLIC_SITE_URL}/api/v1/newsletter/confirm?token=${token}`;
  await sendConfirmation(email, confirmUrl);
}

/** Confirm a pending subscriber by token. Returns true if a row was activated. */
export async function confirm(token: string): Promise<boolean> {
  const sub = await prisma.newsletterSubscriber.findUnique({ where: { token } });
  if (!sub) return false;
  await prisma.newsletterSubscriber.update({
    where: { token },
    data: { status: "active" },
  });
  return true;
}
