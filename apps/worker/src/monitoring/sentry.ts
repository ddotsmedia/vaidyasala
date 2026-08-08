import * as Sentry from "@sentry/node";
import { env } from "../env";

/**
 * Worker Sentry (§10). No DSN ⇒ every export here is an inert no-op, so dev and
 * CI runs stay silent and offline.
 *
 * The worker is where money is spent (AI calls) and where failures are invisible
 * — nobody is watching a screen when an ASR job dies at 2am. So pipeline errors
 * carry the video, stage and provider that produced them, and Prisma spans are on
 * to catch slow queries under batch load.
 */
const DSN = env.SENTRY_DSN;

export function initSentry(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: env.SENTRY_ENV ?? process.env.NODE_ENV ?? "development",
    release: env.SENTRY_RELEASE,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE ?? 0.2,
    sendDefaultPii: false,
    integrations: [Sentry.prismaIntegration()],
  });
}

export const sentryEnabled = (): boolean => Boolean(DSN);

/** Context attached to every pipeline failure. */
export interface PipelineErrorContext {
  stage: string;
  videoId?: string;
  youtubeId?: string;
  jobId?: string;
  attempt?: number;
  provider?: string;
  model?: string;
  costUsd?: number;
}

/**
 * Report a pipeline failure with enough context to debug it without the job data.
 * Tags are the fields worth grouping and alerting on; the rest goes in `extra`.
 */
export function capturePipelineError(err: unknown, ctx: PipelineErrorContext): void {
  if (!DSN) return;
  Sentry.withScope((scope) => {
    scope.setTag("pipeline.stage", ctx.stage);
    if (ctx.provider) scope.setTag("ai.provider", ctx.provider);
    if (ctx.model) scope.setTag("ai.model", ctx.model);
    if (ctx.videoId) scope.setTag("video.id", ctx.videoId);
    scope.setContext("pipeline", { ...ctx });
    // Group by stage rather than by stack: the same provider error from two call
    // sites is one problem to us, not two.
    scope.setFingerprint(["pipeline", ctx.stage, errMessage(err).slice(0, 80)]);
    Sentry.captureException(err instanceof Error ? err : new Error(errMessage(err)));
  });
}

/** Wrap a job in a Sentry span so slow stages are visible next to their queries. */
export async function withJobSpan<T>(
  name: string,
  attrs: Record<string, string | number | undefined>,
  run: () => Promise<T>,
): Promise<T> {
  if (!DSN) return run();
  return Sentry.startSpan(
    {
      name,
      op: "queue.process",
      attributes: Object.fromEntries(
        Object.entries(attrs).filter(([, v]) => v !== undefined),
      ) as Record<string, string | number>,
    },
    run,
  );
}

export async function flushSentry(timeoutMs = 2000): Promise<void> {
  if (!DSN) return;
  try {
    await Sentry.flush(timeoutMs);
  } catch {
    /* shutting down anyway */
  }
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
