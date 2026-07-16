"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { RelatedRail, VideoCard, ShareSheet, Button } from "@vaidyasala/ui";
import type { WatchData } from "@/lib/video";
import { PlayerProvider, usePlayer } from "./player-context";
import { VideoPlayer } from "./video-player";
import { SummaryCard } from "./summary-card";
import { KeyTakeaways } from "./key-takeaways";
import { ChapterList } from "./chapter-list";
import { TranscriptView } from "./transcript-view";
import { FaqAccordion } from "./faq-accordion";
import { StickyPlayer } from "./sticky-player";
import { WatchNextCard } from "./watch-next-card";
import { AudioModeBar } from "./audio-mode-bar";
import { SubscribeOverlay } from "./subscribe-overlay";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Full-keyboard control per §5.5 (space/←/→/↑/↓/m), ignoring form fields. */
function useKeyboardControls(): void {
  const { activated, isPlaying, currentTime, play, pause, seekTo, adjustVolume, toggleMute } =
    usePlayer();
  useEffect(() => {
    if (!activated) return;
    const onKey = (e: KeyboardEvent): void => {
      const el = e.target as HTMLElement | null;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      switch (e.key) {
        case " ":
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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activated, isPlaying, currentTime, play, pause, seekTo, adjustVolume, toggleMute]);
}

function WatchLayout({ data }: { data: WatchData }) {
  const heroRef = useRef<HTMLDivElement>(null);
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
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <div ref={heroRef} className="relative">
            <VideoPlayer
              youtubeId={data.youtubeId}
              videoId={data.id}
              title={data.titleMl}
              thumbnailUrl={data.thumbnailUrl}
            />
            <WatchNextCard next={next} videoId={data.id} />
          </div>

          <h1 className="font-ml text-2xl font-semibold leading-[1.5]" lang="ml">
            {data.titleMl}
          </h1>

          <SummaryCard
            summaryMl={data.summaryMl}
            durationSec={data.durationSec}
            topic={data.topic}
            publishedAt={data.publishedAt}
          />

          <div className="flex flex-wrap items-center gap-3">
            <ShareSheet url={shareUrl} title={data.titleMl} utmSource="watch">
              <Button variant="outline">Share</Button>
            </ShareSheet>
            <AudioModeBar text={data.summaryMl ?? ""} />
          </div>

          <SubscribeOverlay
            channelUrl={data.channelUrl}
            subscriberCount={data.subscriberCount}
            videoId={data.id}
          />

          <KeyTakeaways takeaways={data.takeaways} />
          <TranscriptView segments={data.segments} />
          <FaqAccordion faqs={data.faqs} />
        </div>

        <aside className="flex flex-col gap-6">
          <ChapterList chapters={data.chapters} videoId={data.id} />
        </aside>
      </div>

      {data.related.length > 0 ? (
        <RelatedRail
          className="mt-10"
          title="Watch next"
          videos={data.related}
          renderItem={(v) => (
            <Link href={`/watch/${v.slug}`} className="block">
              <VideoCard video={v} size="md" />
            </Link>
          )}
        />
      ) : null}

      <StickyPlayer title={data.titleMl} heroRef={heroRef} />
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
