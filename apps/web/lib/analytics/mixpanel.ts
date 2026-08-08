"use client";
import type { FunnelEvent } from "@vaidyasala/core/validation";
import type { OverridedMixpanel } from "mixpanel-browser";

/**
 * Mixpanel sink (§7.6). Deliberately lazy — mobile is the primary surface and the
 * SDK is ~60KB gzipped, so it must never sit in the initial bundle or compete with
 * the player for main-thread time on a mid-range phone:
 *
 *   · the SDK is `import()`ed on first track, not at module load;
 *   · the import is deferred to idle (requestIdleCallback) so it lands after LCP;
 *   · events fired before it arrives are queued, not dropped;
 *   · no token, Do-Not-Track, or SSR ⇒ every call is a cheap no-op.
 *
 * First-party `/api/v1/events` remains the source of truth (see ./events). This is
 * a secondary sink, so a blocked or failed Mixpanel load must never break the app
 * or lose a funnel event — every failure path here is silent by design.
 */

type MixpanelModule = OverridedMixpanel;
type Props = Record<string, unknown>;

/** Cohorts (§7.6): assigned client-side from watch history. */
export type Cohort = "first_time_viewer" | "repeat_watcher" | "subscriber";

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const API_HOST = process.env.NEXT_PUBLIC_MIXPANEL_API_HOST;
const STORAGE_KEY = "vs:analytics:profile";

interface QueuedEvent {
  name: string;
  props: Props;
}

let mp: MixpanelModule | null = null;
let loading: Promise<MixpanelModule | null> | null = null;
const queue: QueuedEvent[] = [];
const MAX_QUEUE = 50;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/** Honour Do-Not-Track and Global Privacy Control before loading anything. */
function optedOut(): boolean {
  if (!isBrowser()) return true;
  const nav = navigator as Navigator & { doNotTrack?: string; globalPrivacyControl?: boolean };
  const dnt = nav.doNotTrack ?? (window as { doNotTrack?: string }).doNotTrack;
  return dnt === "1" || dnt === "yes" || nav.globalPrivacyControl === true;
}

export function analyticsEnabled(): boolean {
  return Boolean(TOKEN) && isBrowser() && !optedOut();
}

function whenIdle(fn: () => void): void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  };
  if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(fn, { timeout: 3000 });
  else window.setTimeout(fn, 1200);
}

/** Load the SDK at idle. Resolves to null when disabled or the load fails. */
function load(): Promise<MixpanelModule | null> {
  if (mp) return Promise.resolve(mp);
  if (loading) return loading;
  if (!analyticsEnabled()) return Promise.resolve(null);

  loading = new Promise<MixpanelModule | null>((resolve) => {
    whenIdle(() => {
      import("mixpanel-browser")
        .then((mod) => {
          const lib = (mod.default ?? mod) as MixpanelModule;
          lib.init(TOKEN as string, {
            api_host: API_HOST,
            // Batched XHR keeps the radio quiet on mobile.
            batch_requests: true,
            batch_flush_interval_ms: 5000,
            persistence: "localStorage",
            // We send page views ourselves on route change; autocapture would
            // double-count and add listeners we cannot budget for.
            autocapture: false,
            record_sessions_percent: 0,
            ip: false,
          });
          mp = lib;
          const profile = readProfile();
          if (profile.cohort) lib.register({ cohort: profile.cohort });
          for (const e of queue.splice(0)) lib.track(e.name, e.props);
          resolve(lib);
        })
        .catch(() => resolve(null));
    });
  });
  return loading;
}

// ---- local profile (cohort assignment) ------------------------------------

interface Profile {
  videosWatched: string[];
  subscribed: boolean;
  cohort?: Cohort;
}

function readProfile(): Profile {
  if (!isBrowser()) return { videosWatched: [], subscribed: false };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { videosWatched: [], subscribed: false };
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return {
      videosWatched: Array.isArray(parsed.videosWatched) ? parsed.videosWatched.slice(-50) : [],
      subscribed: parsed.subscribed === true,
      cohort: parsed.cohort,
    };
  } catch {
    return { videosWatched: [], subscribed: false };
  }
}

function writeProfile(p: Profile): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* private mode / quota — cohort just stays unassigned */
  }
}

function cohortFor(p: Profile): Cohort {
  if (p.subscribed) return "subscriber";
  return p.videosWatched.length > 1 ? "repeat_watcher" : "first_time_viewer";
}

/**
 * Record a watched video and re-derive the cohort. Called on play so a viewer
 * moves first_time_viewer → repeat_watcher on their second distinct video.
 */
export function recordWatch(videoId: string): Cohort {
  const p = readProfile();
  if (!p.videosWatched.includes(videoId)) p.videosWatched = [...p.videosWatched, videoId].slice(-50);
  p.cohort = cohortFor(p);
  writeProfile(p);
  applyCohort(p.cohort, { videos_watched: p.videosWatched.length });
  return p.cohort;
}

/** Promote to the subscriber cohort (sticky). */
export function recordSubscribe(): Cohort {
  const p = readProfile();
  p.subscribed = true;
  p.cohort = "subscriber";
  writeProfile(p);
  applyCohort(p.cohort, { subscribed: true });
  return p.cohort;
}

function applyCohort(cohort: Cohort, extra: Props = {}): void {
  if (!analyticsEnabled()) return;
  void load().then((lib) => {
    if (!lib) return;
    lib.register({ cohort });
    lib.people.set({ cohort, ...extra });
  });
}

// ---- public API -----------------------------------------------------------

/** Track an arbitrary event. Safe to call anywhere, any time. */
export function track(name: string, props: Props = {}): void {
  if (!analyticsEnabled()) return;
  if (mp) {
    mp.track(name, props);
    return;
  }
  if (queue.length < MAX_QUEUE) queue.push({ name, props });
  void load();
}

/** Mirror of a first-party funnel event. Called by emitEvent — do not double-call. */
export function trackFunnel(name: FunnelEvent, videoId?: string, props: Props = {}): void {
  track(name, { ...props, ...(videoId ? { video_id: videoId } : {}) });
}

/** Tie events to a signed-in user; keeps anonymous history via Mixpanel identity merge. */
export function identify(userId: string, traits: Props = {}): void {
  if (!analyticsEnabled()) return;
  void load().then((lib) => {
    if (!lib) return;
    lib.identify(userId);
    if (Object.keys(traits).length) lib.people.set(traits);
  });
}

export function reset(): void {
  if (!mp) return;
  try {
    mp.reset();
  } catch {
    /* nothing sensible to do */
  }
}

/** Route-change page view (App Router gives us no automatic one). */
export function trackPageView(path: string, props: Props = {}): void {
  track("page_view", { path, ...props });
}
