"use client";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_PREFS,
  readPrefs,
  stepRate,
  writePrefs,
  type PlaybackRate,
} from "@/lib/player-prefs";

export interface PlayerControls {
  seekTo(sec: number, autoplay: boolean): void;
  play(): void;
  pause(): void;
  adjustVolume(delta: number): void;
  toggleMute(): void;
  setRate(rate: PlaybackRate): void;
}

interface PlayerState {
  activated: boolean;
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  reached75: boolean;
  ended: boolean;
  /** Mirrors the iframe so the settings menu can render a checkmark. */
  rate: PlaybackRate;
  muted: boolean;
  volume: number;
  /** Wide layout — ours, not YouTube's; the iframe is unaware of it. */
  theater: boolean;
}

export interface PlayerApi extends PlayerState {
  activate(): void;
  seekTo(sec: number, autoplay?: boolean): void;
  play(): void;
  pause(): void;
  adjustVolume(delta: number): void;
  toggleMute(): void;
  setRate(rate: PlaybackRate): void;
  /** Step through PLAYBACK_RATES — the `<` / `>` shortcuts. */
  nudgeRate(direction: 1 | -1): void;
  toggleTheater(): void;
  /**
   * Fullscreen the element registered by VideoPlayer. The iframe is
   * cross-origin, so YouTube's own button is out of reach; we fullscreen our
   * own wrapper instead, which the browser honours identically.
   */
  toggleFullscreen(): void;
  /** Internal — VideoPlayer registers the element to fullscreen. */
  __registerShell(el: HTMLElement | null): void;
  /** Internal — VideoPlayer registers its imperative controls here. */
  __registerControls(c: PlayerControls): void;
  __update(p: Partial<PlayerState>): void;
  /** Pending seek requested before the iframe was ready (returns + clears). */
  __takePendingSeek(): { sec: number; autoplay: boolean } | null;
}

const Ctx = createContext<PlayerApi | null>(null);

export function usePlayer(): PlayerApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlayer must be used within <PlayerProvider>");
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  // Server and first client render must agree, so start from DEFAULT_PREFS and
  // adopt stored values in an effect — reading localStorage during render would
  // hydrate-mismatch for anyone who has ever changed a setting.
  const [state, setState] = useState<PlayerState>({
    activated: false,
    isReady: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    reached75: false,
    ended: false,
    rate: DEFAULT_PREFS.rate,
    muted: DEFAULT_PREFS.muted,
    volume: DEFAULT_PREFS.volume,
    theater: DEFAULT_PREFS.theater,
  });
  const controls = useRef<PlayerControls | null>(null);
  const shell = useRef<HTMLElement | null>(null);
  const pendingSeek = useRef<{ sec: number; autoplay: boolean } | null>(null);

  useEffect(() => {
    const p = readPrefs();
    setState((s) => ({ ...s, rate: p.rate, muted: p.muted, volume: p.volume, theater: p.theater }));
  }, []);

  const update = useCallback((p: Partial<PlayerState>) => {
    setState((s) => ({ ...s, ...p }));
  }, []);

  const activate = useCallback(() => setState((s) => ({ ...s, activated: true })), []);

  const seekTo = useCallback((sec: number, autoplay = true) => {
    if (controls.current) controls.current.seekTo(sec, autoplay);
    else {
      pendingSeek.current = { sec, autoplay };
      setState((s) => ({ ...s, activated: true }));
    }
  }, []);

  const play = useCallback(() => controls.current?.play(), []);
  const pause = useCallback(() => controls.current?.pause(), []);

  // Volume/mute mirror the same clamp the player applies, so the value we
  // persist is the value the iframe ended up at.
  const adjustVolume = useCallback((delta: number) => {
    controls.current?.adjustVolume(delta);
    setState((s) => {
      const volume = Math.max(0, Math.min(100, s.volume + delta));
      writePrefs({ volume });
      return { ...s, volume };
    });
  }, []);

  const toggleMute = useCallback(() => {
    controls.current?.toggleMute();
    setState((s) => {
      writePrefs({ muted: !s.muted });
      return { ...s, muted: !s.muted };
    });
  }, []);

  const setRate = useCallback((rate: PlaybackRate) => {
    controls.current?.setRate(rate);
    writePrefs({ rate });
    setState((s) => ({ ...s, rate }));
  }, []);

  const nudgeRate = useCallback((direction: 1 | -1) => {
    setState((s) => {
      const rate = stepRate(s.rate, direction);
      if (rate === s.rate) return s;
      controls.current?.setRate(rate);
      writePrefs({ rate });
      return { ...s, rate };
    });
  }, []);

  const toggleTheater = useCallback(() => {
    setState((s) => {
      writePrefs({ theater: !s.theater });
      return { ...s, theater: !s.theater };
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = shell.current;
    if (!el) return;
    // Both calls reject on a denied user-activation check; nothing to recover,
    // so swallow rather than surface an error the viewer cannot act on.
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void el.requestFullscreen?.().catch(() => {});
  }, []);

  const api = useMemo<PlayerApi>(
    () => ({
      ...state,
      activate,
      seekTo,
      play,
      pause,
      adjustVolume,
      toggleMute,
      setRate,
      nudgeRate,
      toggleTheater,
      toggleFullscreen,
      __registerShell: (el) => {
        shell.current = el;
      },
      __registerControls: (c) => {
        controls.current = c;
      },
      __update: update,
      __takePendingSeek: () => {
        const p = pendingSeek.current;
        pendingSeek.current = null;
        return p;
      },
    }),
    [
      state,
      activate,
      seekTo,
      play,
      pause,
      adjustVolume,
      toggleMute,
      setRate,
      nudgeRate,
      toggleTheater,
      toggleFullscreen,
      update,
    ],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
