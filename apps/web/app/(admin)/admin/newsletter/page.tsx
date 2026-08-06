import type { Metadata } from "next";
import { Badge } from "@vaidyasala/ui";
import { prisma } from "@vaidyasala/db";
import { NewsletterActions } from "@/components/admin/newsletter-actions";

export const metadata: Metadata = { title: "Newsletter" };
export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "default" | "brand" | "cta" | "outline"> = {
  draft: "outline",
  approved: "brand",
  sent: "default",
};

/** /admin/newsletter — issue list + approve → send (§9.3). */
export default async function NewsletterPage() {
  const [issues, subscribers] = await Promise.all([
    prisma.newsletterIssue.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.newsletterSubscriber.count({ where: { status: "confirmed" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Newsletter</h1>
        <Badge>{subscribers} confirmed subscribers</Badge>
      </div>

      {issues.length === 0 ? (
        <p className="text-text-dim text-sm">
          No issues yet — the weekly assembly job creates a draft every Monday.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {issues.map((i) => (
            <li key={i.id} className="border-border flex flex-col gap-2 rounded-md border p-4">
              <div className="flex items-center justify-between">
                <span className="font-ml font-medium" lang="ml">
                  {i.subjectMl}
                </span>
                <Badge variant={STATUS_VARIANT[i.status] ?? "outline"}>{i.status}</Badge>
              </div>
              <p className="text-text-dim line-clamp-2 text-xs">{i.bodyMd.slice(0, 240)}</p>
              <NewsletterActions id={i.id} status={i.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
