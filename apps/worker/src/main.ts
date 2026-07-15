import { CORE_VERSION } from "@vaidyasala/core";
import { queues, QUEUE_NAMES } from "./queues";
import { env } from "./env";

/**
 * Worker entrypoint. BullMQ Workers (one per queue, consuming the §8.2 pipeline
 * jobs) are registered in Phase 2B. For now this boots the connection, asserts
 * the queues exist, and stays alive so the dev/prod containers have a live PID.
 */
async function main(): Promise<void> {
  console.log(
    `[worker] boot · core@${CORE_VERSION} · concurrency=${env.WORKER_CONCURRENCY} · queues=${Object.values(
      QUEUE_NAMES,
    ).join(",")}`,
  );

  // Touch each queue so a misconfigured Redis fails fast at startup.
  await Promise.all(Object.values(queues).map((q) => q.waitUntilReady()));
  console.log("[worker] queues ready");

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[worker] ${signal} received, draining`);
    await Promise.all(Object.values(queues).map((q) => q.close()));
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err: unknown) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
