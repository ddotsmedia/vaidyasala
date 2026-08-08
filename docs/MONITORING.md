# MONITORING — Sentry, Mixpanel, alerts

What is wired in code, and what a human still has to click. Everything here
degrades to a no-op when its key is absent, so dev and CI need none of it.

## Environment

| Variable | Where | Effect when absent |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | web (client+server) | Sentry fully disabled |
| `NEXT_PUBLIC_SENTRY_ENV` | web | falls back to `NODE_ENV` |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | web client | 0.05 |
| `SENTRY_TRACES_SAMPLE_RATE` | web server | 0.2 |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | build | source maps not uploaded |
| `SENTRY_DSN` | worker | worker monitoring disabled |
| `NEXT_PUBLIC_MIXPANEL_TOKEN` | web | Mixpanel never loads |
| `NEXT_PUBLIC_MIXPANEL_API_HOST` | web | Mixpanel default host (set for EU residency) |

## Sentry

**Web** — `instrumentation.ts` (server + edge) and `instrumentation-client.ts`
(browser). `prismaIntegration()` on the server is what produces database query
spans; without it a slow page is just a slow page. Browser traces sample at 5% by
default because mobile is the primary surface. Session replay is off.

Errors route through `/monitoring` (`tunnelRoute`) so ad-blockers do not silently
eat the reports — mobile Safari with a content blocker is a common setup here.

**Video streaming** — `lib/monitoring/video-performance.ts` records
time-to-first-frame and rebuffer count per play session, neither of which appears
in Core Web Vitals (CWV stops at LCP, long before the player mounts). It warns at
>5s to first frame and at ≥3 rebuffers in one session.

**Worker** — `src/monitoring/sentry.ts`. Every stage failure passes through
`runMirrored`, so `capturePipelineError` is called in exactly one place and each
event carries stage, video id, attempt, and provider/model when known. Events are
fingerprinted by stage + message so the same provider error from two call sites
groups as one issue. Sentry is flushed on SIGTERM, since the container is usually
killed within seconds of the error we care about.

## Alerts

`infra/docker/observability/alerts.yml` holds the Prometheus rules, including the
>5% error-rate target as a *ratio* (`errors / requests > 0.05`), guarded against a
zero denominator so an idle night cannot report 100%.

**Manual, in the Sentry UI** — the Prometheus rules cover the origin, but Sentry
should own client-side error alerting:

1. Alerts → Create Alert → Issues → "Number of errors in an issue is more than
   50 in 1 hour" → notify the ops channel.
2. Alerts → Create Alert → Metric → `failure_rate()` on transactions > 5% over
   5 minutes → critical.
3. Set the environment filter to `production` so staging noise stays out.

These need a Sentry account and project; they cannot be provisioned from the repo.

## Mixpanel

`apps/web/lib/analytics/` — import from `@/lib/analytics`.

- The SDK is dynamically imported at browser idle, never in the initial bundle.
- No token, Do-Not-Track, or Global Privacy Control ⇒ every call is a no-op.
- `/api/v1/events` stays the source of truth; Mixpanel is a mirror, so a blocked
  Mixpanel never costs a funnel event.
- Search queries are **not** sent — only `query_length`. People search this site
  for symptoms, and that text should not leave our origin.

**Cohorts** (`localStorage`, re-derived on each play): `first_time_viewer` →
`repeat_watcher` on the second distinct video → `subscriber` after a subscribe
click (sticky).

**Funnel**: `search` → `search_result_click` → `play` → `subscribe_click`.
Also tracked: `pause`, `seek`, `progress_25/50/75`, `complete`.

**Manual, in the Mixpanel UI**: create the funnel report from those five event
names, and the three cohorts from the `cohort` super-property.
