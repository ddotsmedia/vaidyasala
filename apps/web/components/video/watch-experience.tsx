"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { RelatedRail, VideoCard, ShareSheet, Button } from "@vaidyasala/ui";
import { CARD_SIZES } from "@/lib/thumbnail";
import type { WatchData } from "@/lib/video";
import { PlayerProvider, usePlayer } from "./player-context";
import { VideoPlayer } from "./video-player";
import { SummaryCard } from "./summary-card";
import { KeyTakeaways } from "./key-takeaways";
import { ChapterList } from "./chapter-list";
import { TranscriptView } from "./transcript-view";
import { FaqAccordion } from "./faq-accordion";
import { LazyInView } from "./lazy-in-view";
import { ProgressBeacon } from "./progress-beacon";
import { CommentsSheet } from "./comments-sheet";
import { ReactionBar } from "./reaction-bar";
import { PlayerSettings, SHORTCUTS_EVENT } from "./player-settings";
import { SubscribeStickyAside, SubscribeStickyBar } from "./subscribe-sticky";

// Interaction/scroll-only islands — split into their own chunks and mounted only
// when needed (§3D). Motion lives only in these three, so it leaves the initial
// /watch bundle entirely.
const StickyPlayer = dynamic(() => import("./sticky-player").then((m) => m.StickyPlayer), {
  ssr: false,
});
const WatchNextCard = dynamic(() => import("./watch-next-card").then((m) => m.WatchNextCard), {
  ssr: false,
});
const AudioModeBar = dynamic(() => import("./audio-mode-bar").then((m) => m.AudioModeBar), {
  ssr: false,
});
const SubscribeOverlay = dynamic(
  () => import("./subscribe-overlay").then((m) => m.SubscribeOverlay),
  { ssr: false },
);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Full-keyboard control per §5.5, following YouTube's own key map so muscle
 * memory carries over. Typing in a field or a contenteditable is never
 * intercepted, and modifier combinations are left to the browser.
 */
function useKeyboardControls(): void {
  const {
    activated,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    seekTo,
    adjustVolume,
    toggleMute,
    nudgeRate,
    toggleTheater,
    toggleFullscreen,
  } = usePlayer();

  useEffect(() => {
    if (!activated) return;
    const onKey = (e: KeyboardEvent): void => {
      const el = e.target as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      // Ctrl/Cmd/Alt combinations belong to the browser (⌘K, ⌘F, tab switching).
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Digits jump to a percentage of the video — meaningless until the
      // duration is known, which it is not before the first onReady.
      if (/^[0-9]$/.test(e.key) && duration > 0) {
        e.preventDefault();
        seekTo((Number(e.key) / 10) * duration, true);
        return;
      }

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          if (isPlaying) pause();
          else play();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekTo(Math.max(0, currentTime - 5), true);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekTo(currentTime + 5, true);
          break;
        case "j":
        case "J":
          e.preventDefault();
          seekTo(Math.max(0, currentTime - 10), true);
          break;
        case "l":
        case "L":
          e.preventDefault();
          seekTo(currentTime + 10, true);
          break;
        case "Home":
          e.preventDefault();
          seekTo(0, true);
          break;
        case "End":
          if (duration > 0) {
            e.preventDefault();
            seekTo(duration, true);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          adjustVolume(10);
          break;
        case "ArrowDown":
          e.preventDefault();
          adjustVolume(-10);
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        // `<` and `>` are the shifted comma/period, so match the character
        // produced rather than the physical key.
        case "<":
          e.preventDefault();
          nudgeRate(-1);
          break;
        case ">":
          e.preventDefault();
          nudgeRate(1);
          break;
        case "t":
        case "T":
          toggleTheater();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "?":
          e.preventDefault();
          window.dispatchEvent(new Event(SHORTCUTS_EVENT));
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activated,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    seekTo,
    adjustVolume,
    toggleMute,
    nudgeRate,
    toggleTheater,
    toggleFullscreen,
  ]);
}

/**
 * Resolve the resume position client-side so /watch stays static (§11): the URL
 * ?t= (from a Continue-watching link) wins; otherwise fetch the saved position
 * for this device/user. Returns null until known so the player waits.
 */
function useResumeSec(videoId: string): number | null {
  const [resume, setResume] = useState<number | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t");
    if (t !== null) {
      setResume(Math.max(0, Number(t) || 0));
      return;
    }
    let alive = true;
    fetch(`/api/v1/progress?videoId=${encodeURIComponent(videoId)}`)
      .then((r) => (r.ok ? r.json() : { positionSec: 0 }))
      .then((d: { positionSec?: number }) => {
        if (alive) setResume(Math.max(0, d.positionSec ?? 0));
      })
      .catch(() => alive && setResume(0));
    return () => {
      alive = false;
    };
  }, [videoId]);

  return resume;
}

function WatchLayout({ data }: { data: WatchData }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { activated, theater } = usePlayer();
  const resumeSec = useResumeSec(data.id) ?? undefined;
  useKeyboardControls();
  const shareUrl = `${SITE_URL}/watch/${data.slug}`;
  const next = data.related[0]
    ? {
        slug: data.related[0].slug,
        titleMl: data.related[0].titleMl,
        thumbnailUrl: data.related[0].thumbnailUrl,
        watchHref: data.related[0].watchHref,
      }
    : null;

  return (
    <>
      {/* Theater collapses the sidebar column so the player takes the full
          content width. The aside is not unmounted — it moves below, keeping
          chapters reachable and the DOM order stable for screen readers. */}
      <div
        className={
          theater ? "grid gap-8" : "grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]"
        }
      >
        <div className="flex min-w-0 flex-col gap-6">
          <div ref={heroRef} className="relative">
            <VideoPlayer
              youtubeId={data.youtubeId}
              videoId={data.id}
              title={data.titleMl}
              thumbnailUrl={data.thumbnailUrl}
              startSec={resumeSec}
            />
            <ProgressBeacon videoId={data.id} />
            {/* End-of-video overlay — only relevant once playback has started. */}
            {activated ? <WatchNextCard next={next} videoId={data.id} /> : null}
          </div>

          <h1 className="font-ml text-2xl font-semibold leading-[1.5]" lang="ml">
            {data.titleMl}
          </h1>

          <SummaryCard
            summaryMl={data.summaryMl}
            summaryEn={data.summaryEn}
            durationSec={data.durationSec}
            topic={data.topic}
            publishedAt={data.publishedAt}
            viewCount={data.viewCount}
          />

          <div className="flex flex-wrap items-center gap-3">
            <ShareSheet url={shareUrl} title={data.titleMl} utmSource="watch">
              <Button variant="outline">Share</Button>
            </ShareSheet>
            <ReactionBar videoId={data.id} />
            <AudioModeBar text={data.summaryMl ?? ""} />
          </div>

          <PlayerSettings />

          <LazyInView minHeight={96}>
            <SubscribeOverlay
              channelUrl={data.channelUrl}
              subscriberCount={data.subscriberCount}
              videoId={data.id}
            />
          </LazyInView>

          {/* Mounts the scroll-docking mini-player (Motion) as soon as the user
              scrolls into the content below the hero. */}
          <LazyInView>
            <StickyPlayer title={data.titleMl} heroRef={heroRef} />
          </LazyInView>

          <KeyTakeaways takeaways={data.takeaways} />
          {/* Chapters live in the sidebar on desktop; that column stacks below
              the fold on mobile, so a collapsed copy rides here instead. */}
          <div className="lg:hidden">
            <ChapterList chapters={data.chapters} videoId={data.id} collapsible />
          </div>
          <TranscriptView segments={data.segments} />
          <FaqAccordion faqs={data.faqs} />
          <LazyInView minHeight={120}>
            <CommentsSheet videoId={data.id} />
          </LazyInView>
        </div>

        {/* Stays desktop-only in both layouts: on mobile the collapsed
            ChapterList above already covers it, and theater is a wide-screen
            affordance. In theater the single-column grid drops it below. */}
        <aside className="hidden flex-col gap-6 lg:flex">
          <SubscribeStickyAside
            channelUrl={data.channelUrl}
            subscriberCount={data.subscriberCount}
            videoId={data.id}
          />
          <ChapterList chapters={data.chapters} videoId={data.id} />
        </aside>
      </div>

      <SubscribeStickyBar
        channelUrl={data.channelUrl}
        subscriberCount={data.subscriberCount}
        videoId={data.id}
      />

      {data.related.length > 0 ? (
        <LazyInView minHeight={280}>
          <RelatedRail
            className="mt-10"
            title="Watch next"
            videos={data.related}
            renderItem={(v) => (
              <Link href={`/watch/${v.slug}`} className="block">
                <VideoCard video={v} size="md" imageSizes={CARD_SIZES.md} />
              </Link>
            )}
          />
        </LazyInView>
      ) : null}
    </>
  );
}

/** WatchExperience (§6.1): the interactive island for /watch/[slug]. */
export function WatchExperience({ data }: { data: WatchData }) {
  return (
    <PlayerProvider>
      <WatchLayout data={data} />
    </PlayerProvider>
  );
}
