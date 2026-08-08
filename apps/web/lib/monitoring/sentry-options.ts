/**
 * Shared Sentry options (§10 monitoring). One place for the knobs that differ
 * between environments so the three runtimes (browser / node / edge) cannot drift.
 *
 * Absent DSN ⇒ every init is a no-op, which keeps dev and CI quiet without
 * branching at each call site.
 */
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

export const SENTRY_ENV = process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV ?? "development";

const rate = (raw: string | undefined, fallback: number): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
};

/**
 * Trace sample rates. Mobile is the primary surface and traces cost bytes and
 * main-thread time, so the browser samples far more sparingly than the server.
 */
export const TRACES_SAMPLE_RATE = {
  client: rate(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.05),
  server: rate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.2),
} as const;

export const commonOptions = {
  dsn: SENTRY_DSN,
  environment: SENTRY_ENV,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  enabled: Boolean(SENTRY_DSN),
  // Health content: never let request bodies or cookies ride along.
  sendDefaultPii: false,
  maxBreadcrumbs: 30,
} as const;

/** Drop noise that is not actionable — extension errors, aborted fetches, bot 404s. */
const IGNORED = [
  /ResizeObserver loop/i,
  /AbortError/i,
  /Non-Error promise rejection captured/i,
  /Failed to fetch/i,
  /Load failed/i,
  /chrome-extension:/i,
  /moz-extension:/i,
];

export function shouldIgnore(message: string | undefined): boolean {
  if (!message) return false;
  return IGNORED.some((re) => re.test(message));
}
