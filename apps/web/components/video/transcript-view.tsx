"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDuration } from "@vaidyasala/ui";
import type { TranscriptSegment } from "@vaidyasala/core/validation";
import { usePlayer } from "./player-context";

type Lang = "ml" | "en";

/**
 * TranscriptView (§4): playhead-synced, ML/EN toggle, reading mode. The active
 * segment auto-scrolls into view; clicking a segment seeks the player. (True
 * windowed virtualization lands in Phase 3D perf — see DECISIONS.)
 */
export function TranscriptView({ segments }: { segments: TranscriptSegment[] }) {
  const { currentTime, seekTo } = usePlayer();
  const [lang, setLang] = useState<Lang>("ml");
  const [reading, setReading] = useState(false);
  const activeRef = useRef<HTMLButtonElement>(null);

  const activeIndex = useMemo(
    () => segments.findIndex((s) => currentTime >= s.startSec && currentTime < s.endSec),
    [segments, currentTime],
  );

  useEffect(() => {
    if (activeIndex >= 0) activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  if (segments.length === 0) return null;

  return (
    <section className="flex flex-col gap-3" aria-label="Transcript">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Transcript</h2>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setLang((l) => (l === "ml" ? "en" : "ml"))}
            className="border-border rounded-md border px-2 py-1"
          >
            {lang === "ml" ? "ML" : "EN"}
          </button>
          <button
            type="button"
            onClick={() => setReading((r) => !r)}
            aria-pressed={reading}
            className={`rounded-md border px-2 py-1 ${reading ? "border-brand text-brand" : "border-border"}`}
          >
            Reading mode
          </button>
        </div>
      </div>

      <div className={reading ? "max-h-none" : "border-border max-h-[28rem] overflow-y-auto rounded-lg border"}>
        {reading ? (
          <p className="font-ml text-base leading-[1.9]" lang={lang}>
            {segments.map((s) => (lang === "ml" ? s.textMl : (s.textEn ?? s.textMl))).join(" ")}
          </p>
        ) : (
          <ul>
            {segments.map((s, i) => {
              const text = lang === "ml" ? s.textMl : (s.textEn ?? s.textMl);
              const active = i === activeIndex;
              return (
                <li key={`${s.startSec}-${i}`}>
                  <button
                    ref={active ? activeRef : undefined}
                    type="button"
                    onClick={() => seekTo(s.startSec)}
                    aria-current={active}
                    className={`flex w-full items-baseline gap-3 px-3 py-2 text-left transition-colors ${
                      active ? "bg-surface-2" : "hover:bg-surface"
                    }`}
                  >
                    <span className="tabular-nums text-brand shrink-0 text-xs">
                      {formatDuration(s.startSec)}
                    </span>
                    <span
                      className="font-ml leading-[1.8]"
                      lang={lang === "ml" ? "ml" : undefined}
                    >
                      {text}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
