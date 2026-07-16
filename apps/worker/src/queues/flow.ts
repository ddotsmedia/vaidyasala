import { FlowProducer, type FlowJob } from "bullmq";
import {
  QUEUE_NAMES,
  PIPELINE_STAGES,
  idempotencyKey,
  type PipelineStage,
} from "@vaidyasala/core/queue";
import { connection } from "../redis";
import { contentHash } from "../lib/hash";
import type { MirroredResult } from "../lib/process";
import { JOB_OPTS } from "./index";

/** Data carried by every pipeline-stage job. */
export interface PipelineJobData {
  videoId: string;
  youtubeId: string;
  stage: PipelineStage;
}

export type PipelineProcessor = (data: PipelineJobData) => Promise<MirroredResult>;

/**
 * Registry of §8.2 stage processors. Empty until Phase 2C registers real
 * implementations; while empty, ingest skips enqueuing the flow (stops cleanly
 * at PROCESSING) — see createIngestProcessor / main.ts.
 */
const registry = new Map<PipelineStage, PipelineProcessor>();

export function registerPipelineStage(stage: PipelineStage, fn: PipelineProcessor): void {
  registry.set(stage, fn);
}
export function getPipelineProcessor(stage: PipelineStage): PipelineProcessor | undefined {
  return registry.get(stage);
}
export function pipelineStageCount(): number {
  return registry.size;
}

/**
 * Build the per-video flow (§8.2, dependency order). Modeled as a linear chain
 * of nested children so the deepest leaf (`asr`) runs first and completion
 * bubbles up to the root (`quality-gate`) — BullMQ runs children before parents.
 */
export function buildVideoFlow(videoId: string, youtubeId: string): FlowJob {
  const hash = contentHash(youtubeId);
  // Iterate first→last (asr→quality-gate), wrapping the previous node as a child.
  // The leaf (asr) has no children and runs first; the final node built
  // (quality-gate) is the root and runs last.
  let node: FlowJob | undefined;
  for (const stage of PIPELINE_STAGES) {
    node = {
      name: stage,
      queueName: QUEUE_NAMES.pipeline,
      data: { videoId, youtubeId, stage } satisfies PipelineJobData,
      opts: { ...JOB_OPTS, jobId: idempotencyKey(stage, videoId, hash) },
      children: node ? [node] : undefined,
    };
  }
  return node!;
}

let flowProducer: FlowProducer | undefined;
function getFlowProducer(): FlowProducer {
  flowProducer ??= new FlowProducer({ connection });
  return flowProducer;
}

/**
 * Enqueue the §8.2 pipeline for a video. No-op (returns false) while no stage
 * processors are registered, so 2B ingest doesn't spawn a flow nothing consumes.
 */
export async function enqueueVideoPipeline(videoId: string, youtubeId: string): Promise<boolean> {
  if (pipelineStageCount() === 0) return false;
  await getFlowProducer().add(buildVideoFlow(videoId, youtubeId));
  return true;
}

export async function closeFlowProducer(): Promise<void> {
  await flowProducer?.close();
}
