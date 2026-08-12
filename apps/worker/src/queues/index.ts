import { Queue, type JobsOptions } from "bullmq";
import { QUEUE_NAMES, type QueueName } from "@vaidyasala/core/queue";
import { connection } from "../redis";

export { QUEUE_NAMES, type QueueName } from "@vaidyasala/core/queue";

/**
 * Shared job options: exponential backoff ×5 (§2B), bounded retention. Failed
 * jobs are retained for the admin QueueBoard + DLQ inspection.
 */
export const JOB_OPTS: JobsOptions = {
  attempts: 5,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
  removeOnFail: { age: 60 * 60 * 24 * 7 },
};

export const queues: Record<QueueName, Queue> = {
  [QUEUE_NAMES.ingest]: new Queue(QUEUE_NAMES.ingest, { connection, defaultJobOptions: JOB_OPTS }),
  [QUEUE_NAMES.pipeline]: new Queue(QUEUE_NAMES.pipeline, {
    connection,
    defaultJobOptions: JOB_OPTS,
  }),
  [QUEUE_NAMES.ops]: new Queue(QUEUE_NAMES.ops, { connection, defaultJobOptions: JOB_OPTS }),
  // Backfill: its own queue so a catalogue-wide import cannot starve ingest.
  [QUEUE_NAMES.backfill]: new Queue(QUEUE_NAMES.backfill, { connection }),
  // Dead-letter queue: terminal failures are copied here for admin visibility.
  [QUEUE_NAMES.dlq]: new Queue(QUEUE_NAMES.dlq, {
    connection,
    defaultJobOptions: { removeOnComplete: false, removeOnFail: false },
  }),
};

export const dlq = queues[QUEUE_NAMES.dlq];
