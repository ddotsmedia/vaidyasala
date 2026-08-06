"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@vaidyasala/db";
import { authorize } from "@/lib/authz";

export interface ActionResult {
  ok: boolean;
  error?: string;
  sent?: number;
}

/** Approve a draft newsletter issue (§9.3 human-in-the-loop). */
export async function approveIssue(id: string): Promise<ActionResult> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) return { ok: false, error: authz.reason };
  await prisma.newsletterIssue.update({ where: { id }, data: { status: "approved" } });
  await prisma.auditLog.create({
    data: { actorId: authz.ctx!.userId, action: "newsletter.approve", target: id, meta: {} },
  });
  revalidatePath("/admin/newsletter");
  return { ok: true };
}

/**
 * Send an approved issue to confirmed subscribers (§9.3). Resend batch when
 * RESEND_API_KEY is set; otherwise fixture mode records the send without an
 * external call so the flow is testable offline.
 */
export async function sendIssue(id: string): Promise<ActionResult> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) return { ok: false, error: authz.reason };
  const issue = await prisma.newsletterIssue.findUnique({ where: { id } });
  if (!issue || issue.status !== "approved") return { ok: false, error: "not approved" };

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { status: "confirmed" },
    select: { email: true, token: true },
  });

  const key = process.env.RESEND_API_KEY;
  if (key && subscribers.length) {
    try {
      // Resend batch send — personalize the unsubscribe link per recipient.
      await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify(
          subscribers.slice(0, 100).map((s) => ({
            from: process.env.EMAIL_FROM ?? "Vaidyasala <newsletter@vaidyasala.live>",
            to: s.email,
            subject: issue.subjectMl,
            text: issue.bodyMd.replace("{{token}}", s.token),
          })),
        ),
      });
    } catch {
      return { ok: false, error: "send failed" };
    }
  } else {
    // BLOCKED: no RESEND_API_KEY — fixture send (no external call).
    console.log(`[newsletter] fixture send of "${issue.subjectMl}" to ${subscribers.length} subscribers`);
  }

  await prisma.newsletterIssue.update({
    where: { id },
    data: { status: "sent", sentAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      actorId: authz.ctx!.userId,
      action: "newsletter.send",
      target: id,
      meta: { recipients: subscribers.length },
    },
  });
  revalidatePath("/admin/newsletter");
  return { ok: true, sent: subscribers.length };
}
