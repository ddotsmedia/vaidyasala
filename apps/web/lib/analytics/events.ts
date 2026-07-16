"use client";
import { FUNNEL_EVENTS, type FunnelEvent } from "@vaidyasala/core/validation";

export { FUNNEL_EVENTS, type FunnelEvent };

/**
 * Fire-and-forget funnel event → POST /api/v1/events. Uses sendBeacon when
 * available (survives page unload / navigation), else a keepalive fetch.
 */
export function emitEvent(
  name: FunnelEvent,
  videoId?: string,
  props?: Record<string, unknown>,
): void {
  const body = JSON.stringify({ name, videoId, props });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/v1/events", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    /* fall through to fetch */
  }
  void fetch("/api/v1/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
