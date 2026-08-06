import { OPS_JOBS } from "@vaidyasala/core/queue";
import { queues, QUEUE_NAMES } from "./queues";

/**
 * Register repeatable ops schedulers (§9.3). Idempotent: upsertJobScheduler
 * keyed by scheduler id, so re-running the worker never stacks duplicates.
 */
export async function registerCron(): Promise<void> {
  const ops = queues[QUEUE_NAMES.ops];
  // 15-min upload poll fallback (§9.1).
  await ops.upsertJobScheduler(
    "cron:yt-poll",
    { every: 15 * 60 * 1000 },
    { name: OPS_JOBS.ytPoll, data: {} },
  );
  // Hourly stats refresh (§9.3).
  await ops.upsertJobScheduler(
    "cron:stats-refresh",
    { every: 60 * 60 * 1000 },
    { name: OPS_JOBS.statsRefresh, data: {} },
  );
  // Weekly newsletter assembly → NewsletterIssue draft (§9.3, Mondays 06:00).
  await ops.upsertJobScheduler(
    "cron:newsletter-assemble",
    { pattern: "0 6 * * 1" },
    { name: OPS_JOBS.newsletterAssemble, data: {} },
  );
  // Nightly SEO + health sweeps (§7.6/§9.3, 03:00–03:30).
  await ops.upsertJobScheduler(
    "cron:seo-pull",
    { pattern: "0 3 * * *" },
    { name: OPS_JOBS.seoPull, data: {} },
  );
  await ops.upsertJobScheduler(
    "cron:link-crawl",
    { pattern: "15 3 * * *" },
    { name: OPS_JOBS.linkCrawl, data: {} },
  );
  await ops.upsertJobScheduler(
    "cron:search-consistency",
    { pattern: "30 3 * * *" },
    { name: OPS_JOBS.searchConsistency, data: {} },
  );
}
