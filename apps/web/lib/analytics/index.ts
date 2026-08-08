"use client";
/**
 * Analytics entry point (§7.6). Import from `@/lib/analytics`.
 *
 * Two sinks, one call:
 *   · `/api/v1/events` — first party, the source of truth for the admin funnel
 *     dashboards. Always written.
 *   · Mixpanel — secondary, lazy-loaded at idle, silently skipped when there is
 *     no token or the visitor has Do-Not-Track set.
 *
 * Callers should not import ./mixpanel directly for tracking; go through the
 * helpers here so both sinks stay in step.
 */
export { FUNNEL_EVENTS, type FunnelEvent, emitEvent } from "./events";
export {
  analyticsEnabled,
  identify,
  recordSubscribe,
  recordWatch,
  reset,
  track,
  trackPageView,
  type Cohort,
} from "./mixpanel";

import { FUNNEL_EVENTS, emitEvent } from "./events";
import { recordSubscribe, recordWatch, track } from "./mixpanel";

/** Play started. Also advances the viewer's cohort. */
export function trackPlay(videoId: string, props: Record<string, unknown> = {}): void {
  recordWatch(videoId);
  emitEvent(FUNNEL_EVENTS.play, videoId, props);
}

export function trackPause(videoId: string, atSec: number): void {
  emitEvent(FUNNEL_EVENTS.pause, videoId, { at_sec: Math.round(atSec) });
}

export function trackSeek(videoId: string, fromSec: number, toSec: number): void {
  emitEvent(FUNNEL_EVENTS.seek, videoId, {
    from_sec: Math.round(fromSec),
    to_sec: Math.round(toSec),
    direction: toSec >= fromSec ? "forward" : "backward",
  });
}

/** Completion milestones: 25 / 50 / 75 / 100. */
export function trackCompletion(videoId: string, percent: 25 | 50 | 75 | 100): void {
  const name =
    percent === 100
      ? FUNNEL_EVENTS.complete
      : percent === 75
        ? FUNNEL_EVENTS.progress75
        : percent === 50
          ? FUNNEL_EVENTS.progress50
          : FUNNEL_EVENTS.progress25;
  emitEvent(name, videoId, { percent });
}

/** Subscribe CTA clicked — the funnel's terminal step. Promotes the cohort. */
export function trackSubscribeClick(videoId?: string, source = "overlay"): void {
  recordSubscribe();
  emitEvent(FUNNEL_EVENTS.subscribeClick, videoId, { source });
}

// ---- funnel: search → click → watch → subscribe ----------------------------

export function trackSearch(query: string, resultCount: number): void {
  // The query itself is a user input; length is enough to analyse intent without
  // shipping what people typed about their health to a third party.
  emitEvent(FUNNEL_EVENTS.search, undefined, {
    query_length: query.trim().length,
    result_count: resultCount,
  });
}

export function trackSearchResultClick(videoId: string, position: number, query: string): void {
  emitEvent(FUNNEL_EVENTS.searchResultClick, videoId, {
    position,
    query_length: query.trim().length,
  });
}

/** Convenience for non-funnel product events that only need the Mixpanel sink. */
export function trackProductEvent(name: string, props: Record<string, unknown> = {}): void {
  track(name, props);
}
