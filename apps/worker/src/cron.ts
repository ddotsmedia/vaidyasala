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
}
