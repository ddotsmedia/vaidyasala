import type { PrismaClient } from "@vaidyasala/db";
import type { AsrProvider, LlmProvider, EmbedProvider, R2Ref } from "@vaidyasala/core/ai";
import type { PipelineJobData } from "../queues/flow";
import type { MirroredResult } from "../lib/process";
import { ClaudeLlmProvider, SarvamAsrProvider, HostedEmbedProvider, prompts } from "@vaidyasala/core/ai";
import { prisma } from "@vaidyasala/db";
import { env } from "../env";
import { createStorageFromEnv, type StoragePort } from "../storage/s3";
import { createMeiliFromEnv, type MeiliPort } from "../search/meili";

/** Everything the §8.2 pipeline stages need. All ports are injectable for tests. */
export interface PipelineDeps {
  prisma: PrismaClient;
  storage: StoragePort;
  asr: AsrProvider;
  llm: LlmProvider;
  embed: EmbedProvider;
  meili: MeiliPort | null;
  glossary: prompts.GlossaryEntry[];
  log: (msg: string) => void;
}

/** A pipeline stage processor and its dependency-injected factory. */
export type StageProcessor = (data: PipelineJobData) => Promise<MirroredResult>;
export type StageFactory = (deps: PipelineDeps) => StageProcessor;

/**
 * Resolve a stored audio object to a fetchable URL for ASR. Requires a public
 * base (R2 custom domain / MinIO public bucket); absent ⇒ BLOCKED at call time.
 */
function audioUrlResolver(ref: R2Ref): Promise<string> {
  if (!env.S3_PUBLIC_BASE_URL) {
    // BLOCKED: no S3_PUBLIC_BASE_URL — ASR needs a fetchable audio URL.
    return Promise.reject(new Error("audio URL unavailable: set S3_PUBLIC_BASE_URL for ASR"));
  }
  return Promise.resolve(`${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${ref.key}`);
}

/** Build live pipeline deps from env (providers throw at call time if keys absent). */
export function createPipelineDepsFromEnv(
  log: (msg: string) => void = () => {},
): PipelineDeps {
  return {
    prisma,
    storage: createStorageFromEnv(),
    asr: new SarvamAsrProvider({ apiKey: env.SARVAM_API_KEY, resolveUrl: audioUrlResolver }),
    llm: new ClaudeLlmProvider({ apiKey: env.ANTHROPIC_API_KEY }),
    embed: new HostedEmbedProvider({ apiKey: env.EMBED_API_KEY }),
    meili: createMeiliFromEnv(),
    glossary: prompts.SEED_GLOSSARY,
    log,
  };
}
