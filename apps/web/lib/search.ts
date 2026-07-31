import "server-only";
import { SearchClient } from "@vaidyasala/core/search/client";
import { env } from "./env";

/** Process-wide SearchClient (null when Meili unconfigured). */
const globalForSearch = globalThis as unknown as { search?: SearchClient | null };

export const searchClient: SearchClient | null =
  globalForSearch.search ?? SearchClient.fromEnv(env);

if (process.env.NODE_ENV !== "production") globalForSearch.search = searchClient;
