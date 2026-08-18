/**
 * Player preferences that survive navigation (§4).
 *
 * Device-scoped, so localStorage rather than the database: there are no
 * registered users, and volume is a property of "these speakers", not of a
 * person. Every read is defensive — a viewer with storage disabled, or a key
 * left over from an older build, must fall back to the default rather than
 * throw inside a render.
 */

const KEY = "vs.player.prefs";

/** Rates YouTube reliably honours; anything else is refused by the API. */
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export interface PlayerPrefs {
  /** 0–100, matching the IFrame API's scale. */
  volume: number;
  muted: boolean;
  rate: PlaybackRate;
  theater: boolean;
}

export const DEFAULT_PREFS: PlayerPrefs = {
  volume: 100,
  muted: false,
  rate: 1,
  theater: false,
};

function isRate(v: unknown): v is PlaybackRate {
  return PLAYBACK_RATES.includes(v as PlaybackRate);
}

/** Read stored prefs, falling back per-field so one bad key cannot poison the rest. */
export function readPrefs(): PlayerPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_PREFS;
    const p = parsed as Record<string, unknown>;
    return {
      volume:
        typeof p.volume === "number" && p.volume >= 0 && p.volume <= 100
          ? p.volume
          : DEFAULT_PREFS.volume,
      muted: typeof p.muted === "boolean" ? p.muted : DEFAULT_PREFS.muted,
      rate: isRate(p.rate) ? p.rate : DEFAULT_PREFS.rate,
      theater: typeof p.theater === "boolean" ? p.theater : DEFAULT_PREFS.theater,
    };
  } catch {
    // Private mode, quota, or corrupt JSON — defaults are always playable.
    return DEFAULT_PREFS;
  }
}

/** Merge and persist. Failure is silent: losing a preference must not break playback. */
export function writePrefs(patch: Partial<PlayerPrefs>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...readPrefs(), ...patch }));
  } catch {
    /* storage unavailable — preferences simply do not persist */
  }
}

/** Next/previous rate in PLAYBACK_RATES, clamped at the ends (for `<` / `>`). */
export function stepRate(current: PlaybackRate, direction: 1 | -1): PlaybackRate {
  const i = PLAYBACK_RATES.indexOf(current);
  const next = Math.min(PLAYBACK_RATES.length - 1, Math.max(0, (i === -1 ? 2 : i) + direction));
  return PLAYBACK_RATES[next]!;
}
