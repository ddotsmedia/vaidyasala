import { MeiliSearch } from "meilisearch";
import type { VideoSearchDoc } from "@vaidyasala/core/search";
import { env } from "../env";

/** Thin Meilisearch upsert port (§14). Null when unconfigured (2C skips it). */
export interface MeiliPort {
  upsertVideos(docs: VideoSearchDoc[]): Promise<void>;
}

/** Build a Meili client from env, or null if no master key (index config = Phase 4). */
export function createMeiliFromEnv(): MeiliPort | null {
  if (!env.MEILI_MASTER_KEY) return null;
  const client = new MeiliSearch({ host: env.MEILI_URL, apiKey: env.MEILI_MASTER_KEY });
  return {
    async upsertVideos(docs) {
      if (docs.length === 0) return;
      await client.index("videos").addDocuments(docs, { primaryKey: "id" });
    },
  };
}
