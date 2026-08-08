/**
 * Server + edge Sentry init (§10). Next calls `register()` once per runtime.
 * Prisma instrumentation is what gives us database query performance — without
 * it, a slow query shows up only as a slow route with no detail.
 */
import * as Sentry from "@sentry/nextjs";
import { commonOptions, SENTRY_DSN, TRACES_SAMPLE_RATE, shouldIgnore } from "@/lib/monitoring/sentry-options";

export async function register(): Promise<void> {
  if (!SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      ...commonOptions,
      tracesSampleRate: TRACES_SAMPLE_RATE.server,
      integrations: [Sentry.prismaIntegration()],
      beforeSend(event) {
        if (shouldIgnore(event.exception?.values?.[0]?.value ?? event.message)) return null;
        return event;
      },
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      ...commonOptions,
      tracesSampleRate: TRACES_SAMPLE_RATE.server,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
