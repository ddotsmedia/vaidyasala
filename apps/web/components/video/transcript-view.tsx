"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatDuration, HighlightedText } from "@vaidyasala/ui";
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
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  const activeRef = useRef<HTMLButtonElement>(null);

  const activeIndex = useMemo(
    () => segments.findIndex((s) => currentTime >= s.startSec && currentTime < s.endSec),
    [segments, currentTime],
  );

  const trimmed = query.trim();
  const matches = useMemo(() => {
    if (!trimmed) return null;
    const needle = trimmed.toLocaleLowerCase();
    const hits = new Set<number>();
    segments.forEach((s, i) => {
      const hay = `${s.textMl} ${s.textEn ?? ""}`.toLocaleLowerCase();
      if (hay.includes(needle)) hits.add(i);
    });
    return hits;
  }, [segments, trimmed]);

  useEffect(() => {
    // Auto-scroll follows the playhead, but not while the viewer is reading
    // search results — yanking the list out from under them is hostile.
    if (matches) return;
    if (activeIndex >= 0) activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex, matches]);

  if (segments.length === 0) return null;

  return (
    <section className="flex flex-col gap-3" aria-label="Transcript">
      <div className="flex items-center justify-between gap-3">
        {/* On mobile the heading doubles as the collapse toggle — a transcript is
            the longest thing on the page and pushes everything else off-screen.
            From md up it is a plain heading and the body is always shown. */}
        <h2 className="text-lg font-semibold">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={bodyId}
            className="focus-visible:outline-focus flex min-h-11 items-center gap-2 focus-visible:outline-2 md:pointer-events-none"
          >
            Transcript
            <ChevronDown
              className={`text-text-dim size-5 transition-transform md:hidden ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        </h2>
        <div className={`items-center gap-2 text-sm ${open ? "flex" : "hidden"} md:flex`}>
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

      {!reading ? (
        <div className={`items-center gap-2 ${open ? "flex" : "hidden"} md:flex`}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcript"
            aria-label="Search transcript"
            className="border-border bg-surface focus-visible:outline-focus font-ml min-w-0 flex-1 rounded-md border px-3 py-2 text-sm leading-[1.7] focus-visible:outline-2"
          />
          {matches ? (
            <span aria-live="polite" className="text-text-dim shrink-0 text-xs tabular-nums">
              {matches.size} {matches.size === 1 ? "match" : "matches"}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        id={bodyId}
        className={`${open ? "block" : "hidden"} md:block ${
          reading ? "max-h-none" : "border-border max-h-[28rem] overflow-y-auto rounded-lg border"
        }`}
      >
        {matches?.size === 0 ? (
          <p className="text-text-dim px-3 py-6 text-center text-sm">
            No transcript lines match “{trimmed}”.
          </p>
        ) : null}
        {reading ? (
          <p className="font-ml text-base leading-[1.9]" lang={lang}>
            {segments.map((s) => (lang === "ml" ? s.textMl : (s.textEn ?? s.textMl))).join(" ")}
          </p>
        ) : (
          <ul>
            {segments.map((s, i) => {
              if (matches && !matches.has(i)) return null;
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
                      <HighlightedText text={text} query={trimmed} />
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
