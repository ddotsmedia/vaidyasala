/**
 * Browser Sentry init (§10). Loaded by Next's client instrumentation hook.
 *
 * Mobile-first budget: tracing is sampled at 5% by default, session replay is off
 * entirely, and no integration is added that observes every interaction. What we
 * do keep is browser tracing, because that is what surfaces slow video streaming
 * — the thing this app lives or dies on.
 */
import * as Sentry from "@sentry/nextjs";
import {
  commonOptions,
  SENTRY_DSN,
  TRACES_SAMPLE_RATE,
  shouldIgnore,
} from "@/lib/monitoring/sentry-options";

if (SENTRY_DSN) {
  Sentry.init({
    ...commonOptions,
    tracesSampleRate: TRACES_SAMPLE_RATE.client,
    integrations: [
      Sentry.browserTracingIntegration(),
      // Long-running video sessions produce long tasks by nature; keep the HTTP
      // timing that matters for streaming without the noise of every interaction.
      Sentry.browserProfilingIntegration(),
    ],
    profilesSampleRate: 0,
    beforeSend(event) {
      if (shouldIgnore(event.exception?.values?.[0]?.value ?? event.message)) return null;
      return event;
    },
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
