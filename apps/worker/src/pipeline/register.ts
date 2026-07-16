import type { PipelineStage } from "@vaidyasala/core/queue";
import { registerPipelineStage } from "../queues/flow";
import type { PipelineDeps, StageFactory } from "./deps";
import { asrStage } from "../jobs/asr";
import { correctStage } from "../jobs/correct";
import { translateStage } from "../jobs/translate";
import { chapterizeStage } from "../jobs/chapterize";
import { enrichStage } from "../jobs/enrich";
import { articleStage } from "../jobs/article";
import { embedStage } from "../jobs/embed";
import { linkStage } from "../jobs/link";
import { indexSearchStage } from "../jobs/index-search";
import { qualityGateStage } from "../jobs/quality-gate";

/** §8.2 stage → factory. Keys match PIPELINE_STAGES exactly. */
export const STAGE_FACTORIES: Record<PipelineStage, StageFactory> = {
  asr: asrStage,
  correct: correctStage,
  translate: translateStage,
  chapterize: chapterizeStage,
  enrich: enrichStage,
  article: articleStage,
  embed: embedStage,
  link: linkStage,
  "index-search": indexSearchStage,
  "quality-gate": qualityGateStage,
};

/** Register every §8.2 stage processor. Called at worker boot (activates the flow). */
export function registerPipelineStages(deps: PipelineDeps): void {
  for (const [stage, factory] of Object.entries(STAGE_FACTORIES)) {
    registerPipelineStage(stage as PipelineStage, factory(deps));
  }
}
