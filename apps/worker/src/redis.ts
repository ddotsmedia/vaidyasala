import type { ConnectionOptions } from "bullmq";
import { env } from "./env";

/**
 * BullMQ connection options derived from REDIS_URL. We hand BullMQ a plain
 * options object (not a shared ioredis instance) so it owns the connection
 * lifecycle and there is a single ioredis version at the boundary;
 * `maxRetriesPerRequest: null` is required by BullMQ.
 */
function optionsFromUrl(url: string): ConnectionOptions {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 6379,
    username: u.username || undefined,
    password: u.password || undefined,
    db: u.pathname && u.pathname.length > 1 ? Number(u.pathname.slice(1)) : 0,
    maxRetriesPerRequest: null,
  };
}

export const connection: ConnectionOptions = optionsFromUrl(env.REDIS_URL);
