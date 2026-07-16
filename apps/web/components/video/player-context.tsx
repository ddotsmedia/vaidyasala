"use client";
import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

export interface PlayerControls {
  seekTo(sec: number, autoplay: boolean): void;
  play(): void;
  pause(): void;
  adjustVolume(delta: number): void;
  toggleMute(): void;
}

interface PlayerState {
  activated: boolean;
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  reached75: boolean;
  ended: boolean;
}

export interface PlayerApi extends PlayerState {
  activate(): void;
  seekTo(sec: number, autoplay?: boolean): void;
  play(): void;
  pause(): void;
  adjustVolume(delta: number): void;
  toggleMute(): void;
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
  const [state, setState] = useState<PlayerState>({
    activated: false,
    isReady: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    reached75: false,
    ended: false,
  });
  const controls = useRef<PlayerControls | null>(null);
  const pendingSeek = useRef<{ sec: number; autoplay: boolean } | null>(null);

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
  const adjustVolume = useCallback((delta: number) => controls.current?.adjustVolume(delta), []);
  const toggleMute = useCallback(() => controls.current?.toggleMute(), []);

  const api = useMemo<PlayerApi>(
    () => ({
      ...state,
      activate,
      seekTo,
      play,
      pause,
      adjustVolume,
      toggleMute,
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
    [state, activate, seekTo, play, pause, adjustVolume, toggleMute, update],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
