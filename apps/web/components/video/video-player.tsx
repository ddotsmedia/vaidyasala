"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { FUNNEL_EVENTS, emitEvent } from "@/lib/analytics/events";
import { usePlayer } from "./player-context";
import { loadYouTubeApi, type YTPlayer } from "./youtube";

export interface VideoPlayerProps {
  youtubeId: string;
  videoId: string;
  title: string;
  thumbnailUrl: string;
  startSec?: number;
}

/**
 * Facade YouTube player (§4, §6.1). Renders a thumbnail + play button (keeps LCP
 * clean); on first interaction it injects the IFrame API player and emits the
 * funnel events play / progress 25·50·75 / complete.
 */
export function VideoPlayer({ youtubeId, videoId, title, thumbnailUrl, startSec }: VideoPlayerProps) {
  const player = usePlayer();
  const { activated, activate, __registerControls, __update, __takePendingSeek } = player;
  const mountRef = useRef<HTMLDivElement>(null);
  const ytRef = useRef<YTPlayer | null>(null);
  const fired = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!activated || !mountRef.current) return;
    let cancelled = false;

    void loadYouTubeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;
      const yt = new YT.Player(mountRef.current, {
        videoId: youtubeId,
        host: "https://www.youtube-nocookie.com",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, start: startSec ?? 0 },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            ytRef.current = e.target;
            __registerControls({
              seekTo: (sec, autoplay) => {
                e.target.seekTo(sec, true);
                if (autoplay) e.target.playVideo();
              },
              play: () => e.target.playVideo(),
              pause: () => e.target.pauseVideo(),
              adjustVolume: (delta) =>
                e.target.setVolume(Math.max(0, Math.min(100, e.target.getVolume() + delta))),
              toggleMute: () => (e.target.isMuted() ? e.target.unMute() : e.target.mute()),
            });
            __update({ isReady: true, duration: e.target.getDuration() });
            const pending = __takePendingSeek();
            if (pending) e.target.seekTo(pending.sec, true);
            e.target.playVideo();
          },
          onStateChange: (e: { data: number; target: YTPlayer }) => {
            const { PLAYING, PAUSED, ENDED } = YT.PlayerState;
            if (e.data === PLAYING) {
              __update({ isPlaying: true, duration: e.target.getDuration() });
              if (!fired.current.has("play")) {
                fired.current.add("play");
                emitEvent(FUNNEL_EVENTS.play, videoId);
              }
              startPolling(e.target);
            } else if (e.data === PAUSED) {
              __update({ isPlaying: false });
              stopPolling();
            } else if (e.data === ENDED) {
              __update({ isPlaying: false, ended: true, reached75: true });
              stopPolling();
              if (!fired.current.has("complete")) {
                fired.current.add("complete");
                emitEvent(FUNNEL_EVENTS.complete, videoId);
              }
            }
          },
        },
      });
      ytRef.current = yt;
    });

    function startPolling(yt: YTPlayer): void {
      stopPolling();
      pollRef.current = setInterval(() => {
        const t = yt.getCurrentTime();
        const d = yt.getDuration() || 1;
        __update({ currentTime: t, duration: d });
        const pct = (t / d) * 100;
        for (const [mark, name] of [
          [25, FUNNEL_EVENTS.progress25],
          [50, FUNNEL_EVENTS.progress50],
          [75, FUNNEL_EVENTS.progress75],
        ] as const) {
          if (pct >= mark && !fired.current.has(name)) {
            fired.current.add(name);
            emitEvent(name, videoId);
            if (mark === 75) __update({ reached75: true });
          }
        }
      }, 1000);
    }
    function stopPolling(): void {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [activated, youtubeId, videoId, startSec, __registerControls, __update, __takePendingSeek]);

  return (
    <div className="bg-surface relative aspect-video w-full overflow-hidden rounded-xl">
      {activated ? (
        <div ref={mountRef} className="size-full" />
      ) : (
        <button
          type="button"
          onClick={activate}
          className="group focus-visible:outline-focus absolute inset-0 size-full focus-visible:outline-2"
          aria-label={`Play: ${title}`}
        >
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover"
          />
          <span className="absolute inset-0 grid place-items-center bg-black/20 transition-colors group-hover:bg-black/30">
            <span className="bg-cta text-cta-fg grid size-16 place-items-center rounded-full shadow-3 transition-transform group-hover:scale-105">
              <Play className="size-7 translate-x-0.5 fill-current" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
