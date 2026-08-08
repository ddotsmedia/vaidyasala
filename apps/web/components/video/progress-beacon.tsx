"use client";
import { useEffect, useRef } from "react";
import { usePlayer } from "./player-context";

/**
 * Watch-progress beacon (§6.1/§13). Posts the current position to
 * /api/v1/progress every ~10s while playing, on completion, and on page-hide
 * (via sendBeacon so it survives navigation) — powering Continue Watching and
 * resume-at-position. Anonymous-first: the server keys it to a device cookie.
 */
export function ProgressBeacon({ videoId }: { videoId: string }) {
  const { currentTime, isPlaying, ended, duration } = usePlayer();
  const lastSent = useRef(0);
  const posRef = useRef(0);
  const durRef = useRef(0);
  posRef.current = Math.floor(currentTime);
  durRef.current = duration;

  const send = (positionSec: number, completed: boolean, beacon = false) => {
    if (positionSec <= 0 && !completed) return;
    // Furthest point reached as a percentage; the server keeps the max, so
    // scrubbing backwards never lowers it.
    const watchedPercentage = completed
      ? 100
      : durRef.current > 0
        ? Math.min(100, Math.round((positionSec / durRef.current) * 100))
        : 0;
    const payload = JSON.stringify({ videoId, positionSec, completed, watchedPercentage });
    if (beacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/v1/progress", new Blob([payload], { type: "application/json" }));
    } else {
      void fetch("/api/v1/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
    lastSent.current = positionSec;
  };

  // Throttled progress while playing (fires when position crosses a 10s step).
  useEffect(() => {
    if (!isPlaying) return;
    const pos = Math.floor(currentTime);
    if (pos - lastSent.current >= 10) send(pos, false);
  }, [currentTime, isPlaying]);

  // Completion.
  useEffect(() => {
    if (ended) send(Math.floor(duration || posRef.current), true);
  }, [ended]);

  // Flush on page-hide / unmount.
  useEffect(() => {
    const flush = () => {
      if (posRef.current > lastSent.current) send(posRef.current, false, true);
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [videoId]);

  return null;
}
