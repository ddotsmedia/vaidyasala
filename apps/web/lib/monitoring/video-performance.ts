"use client";
import * as Sentry from "@sentry/nextjs";
import { SENTRY_DSN } from "./sentry-options";

/**
 * Video streaming performance (§10). The numbers that decide whether a viewer
 * stays are: how long from tap to first frame, and how often playback stalls.
 * Neither is visible in a normal page transaction, so we record them explicitly.
 *
 * Everything here is a no-op without a DSN, and none of it allocates until the
 * player is actually activated.
 */

interface StreamSpanState {
  videoId: string;
  startedAt: number;
  firstFrameMs?: number;
  rebuffers: number;
  rebufferMs: number;
  bufferingSince?: number;
}

let current: StreamSpanState | null = null;

/** Called when the viewer taps play — starts the tap-to-first-frame measurement. */
export function beginStreamSession(videoId: string): void {
  if (!SENTRY_DSN) return;
  current = { videoId, startedAt: performance.now(), rebuffers: 0, rebufferMs: 0 };
  Sentry.addBreadcrumb({ category: "video", message: "play_requested", data: { videoId } });
}

/** First frame rendered. The single most important streaming metric we have. */
export function markFirstFrame(): void {
  if (!SENTRY_DSN || !current || current.firstFrameMs !== undefined) return;
  current.firstFrameMs = performance.now() - current.startedAt;
  Sentry.setMeasurement("video.time_to_first_frame", current.firstFrameMs, "millisecond");
  // A slow start is the most common complaint and is invisible in CWV, which
  // stops measuring at LCP — long before the player is even mounted.
  if (current.firstFrameMs > 5000) {
    Sentry.captureMessage("video: slow time-to-first-frame", {
      level: "warning",
      tags: { video_id: current.videoId },
      extra: { ms: Math.round(current.firstFrameMs) },
    });
  }
}

export function markBufferingStart(): void {
  if (!SENTRY_DSN || !current || current.bufferingSince !== undefined) return;
  current.bufferingSince = performance.now();
}

export function markBufferingEnd(): void {
  if (!SENTRY_DSN || !current || current.bufferingSince === undefined) return;
  const stalled = performance.now() - current.bufferingSince;
  current.bufferingSince = undefined;
  // Sub-second blips are normal seeking behaviour, not a stall worth counting.
  if (stalled < 800) return;
  current.rebuffers += 1;
  current.rebufferMs += stalled;
}

/** Flush the session's measurements. Safe to call more than once. */
export function endStreamSession(): void {
  if (!SENTRY_DSN || !current) return;
  const { videoId, firstFrameMs, rebuffers, rebufferMs } = current;
  current = null;
  Sentry.addBreadcrumb({
    category: "video",
    message: "session_end",
    data: {
      videoId,
      first_frame_ms: firstFrameMs ? Math.round(firstFrameMs) : undefined,
      rebuffers,
      rebuffer_ms: Math.round(rebufferMs),
    },
  });
  if (rebuffers >= 3) {
    Sentry.captureMessage("video: repeated rebuffering", {
      level: "warning",
      tags: { video_id: videoId },
      extra: { rebuffers, rebuffer_ms: Math.round(rebufferMs) },
    });
  }
}
