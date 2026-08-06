import type { PrismaClient } from "@vaidyasala/db";

export interface NewsletterAssembleDeps {
  prisma: PrismaClient;
  siteUrl?: string;
  log?: (msg: string) => void;
}

/**
 * Weekly newsletter assembly (§9.3): stitch the last 7 days of published videos'
 * `Enrichment.newsletterMd` sections into a NewsletterIssue DRAFT for an editor to
 * approve before send (§8.3 human-in-the-loop). Idempotent within the day — a
 * second run replaces the still-draft issue rather than duplicating it.
 */
export function createNewsletterAssembleProcessor(deps: NewsletterAssembleDeps) {
  const log = deps.log ?? (() => {});
  const siteUrl = (deps.siteUrl ?? "https://vaidhyasala.com").replace(/\/$/, "");

  return async function runNewsletterAssemble(): Promise<{ issued: number; costUsd: number }> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const videos = await deps.prisma.video.findMany({
      where: { status: "PUBLISHED", publishedAt: { gte: since } },
      orderBy: { publishedAt: "desc" },
      include: { enrichment: { select: { newsletterMd: true, summaryMl: true } } },
    });

    if (videos.length === 0) {
      log("[newsletter-assemble] no videos in the last 7 days — skipping");
      return { issued: 0, costUsd: 0 };
    }

    const sections = videos.map((v) => {
      const md = v.enrichment?.newsletterMd?.trim() || `## ${v.titleMl}\n\n${v.enrichment?.summaryMl ?? ""}`;
      return `${md}\n\n▶ ${siteUrl}/watch/${v.slug}`;
    });
    const bodyMd = [
      "# വൈദ്യശാല — വാരാന്ത്യ ആരോഗ്യ വാർത്താക്കുറിപ്പ്",
      "",
      `ഈ ആഴ്ചയിലെ ${videos.length} പുതിയ വീഡിയോകൾ:`,
      "",
      sections.join("\n\n---\n\n"),
      "",
      `[Unsubscribe](${siteUrl}/api/v1/newsletter/unsubscribe?token={{token}})`,
    ].join("\n");
    const subjectMl = `വൈദ്യശാല: ഈ ആഴ്ചയിലെ ${videos.length} ആരോഗ്യ വീഡിയോകൾ`;

    // Replace an existing not-yet-sent draft rather than pile up duplicates.
    const draft = await deps.prisma.newsletterIssue.findFirst({ where: { status: "draft" } });
    if (draft) {
      await deps.prisma.newsletterIssue.update({ where: { id: draft.id }, data: { subjectMl, bodyMd } });
    } else {
      await deps.prisma.newsletterIssue.create({ data: { subjectMl, bodyMd, status: "draft" } });
    }

    log(`[newsletter-assemble] draft ready from ${videos.length} videos`);
    return { issued: 1, costUsd: 0 };
  };
}
