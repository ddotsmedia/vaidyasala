import { SearchClient } from "@vaidyasala/core/search/client";
import type { VideoSearchDoc } from "@vaidyasala/core/search";
import { env } from "../env";

/** Thin Meilisearch upsert port (§14). Null when unconfigured (2C skips it). */
export interface MeiliPort {
  upsertVideos(docs: VideoSearchDoc[]): Promise<void>;
}

/**
 * Build a Meili port from env, or null if no master key. Backed by the shared
 * core SearchClient so index settings (§14 weights/synonyms) stay in one place;
 * indexes are ensured once, lazily, on the first upsert.
 */
export function createMeiliFromEnv(): MeiliPort | null {
  const client = SearchClient.fromEnv(env);
  if (!client) return null;
  let ensured: Promise<void> | null = null;
  return {
    async upsertVideos(docs) {
      if (docs.length === 0) return;
      ensured ??= client.ensureIndexes();
      await ensured;
      await client.upsertVideos(docs);
    },
  };
}
