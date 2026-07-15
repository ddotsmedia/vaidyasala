import { Queue } from "bullmq";
import { connection } from "../redis";

/**
 * Queue definitions. One flow per video (parent + child jobs per §8.2) is wired
 * in Phase 2B; here we declare the queue names so the skeleton boots cleanly.
 */
export const QUEUE_NAMES = {
  ingest: "vaidyasala.ingest",
  pipeline: "vaidyasala.pipeline",
  ops: "vaidyasala.ops",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const queues: Record<QueueName, Queue> = {
  [QUEUE_NAMES.ingest]: new Queue(QUEUE_NAMES.ingest, { connection }),
  [QUEUE_NAMES.pipeline]: new Queue(QUEUE_NAMES.pipeline, { connection }),
  [QUEUE_NAMES.ops]: new Queue(QUEUE_NAMES.ops, { connection }),
};
