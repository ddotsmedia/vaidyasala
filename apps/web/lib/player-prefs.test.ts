import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PREFS,
  PLAYBACK_RATES,
  readPrefs,
  stepRate,
  writePrefs,
  type PlaybackRate,
} from "./player-prefs";

/** jsdom-free stub — the module only touches getItem/setItem. */
function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
  return store;
}

const KEY = "vs.player.prefs";

describe("player prefs", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = installStorage();
  });

  it("returns defaults with nothing stored", () => {
    expect(readPrefs()).toEqual(DEFAULT_PREFS);
  });

  it("round-trips a written patch, preserving untouched fields", () => {
    writePrefs({ rate: 1.5, muted: true });
    expect(readPrefs()).toEqual({ ...DEFAULT_PREFS, rate: 1.5, muted: true });
  });

  // Each of these is a value a real browser can hold: an older build's schema,
  // a hand-edited key, or a half-written record. None may throw during render.
  it.each([
    ["corrupt JSON", "{not json"],
    ["a JSON scalar", '"hello"'],
    ["null", "null"],
    ["an array", "[1,2,3]"],
  ])("falls back to defaults for %s", (_label, raw) => {
    store.set(KEY, raw);
    expect(readPrefs()).toEqual(DEFAULT_PREFS);
  });

  it("rejects field values out of range but keeps the valid siblings", () => {
    store.set(KEY, JSON.stringify({ volume: 900, rate: 3, muted: "yes", theater: true }));
    expect(readPrefs()).toEqual({
      volume: DEFAULT_PREFS.volume, // 900 is outside 0–100
      rate: DEFAULT_PREFS.rate, // 3× is not a rate YouTube offers
      muted: DEFAULT_PREFS.muted, // "yes" is not a boolean
      theater: true, // the one good field survives
    });
  });

  it("accepts the boundary volumes", () => {
    writePrefs({ volume: 0 });
    expect(readPrefs().volume).toBe(0);
    writePrefs({ volume: 100 });
    expect(readPrefs().volume).toBe(100);
  });

  describe("stepRate", () => {
    it("moves one step through the supported rates", () => {
      expect(stepRate(1, 1)).toBe(1.25);
      expect(stepRate(1, -1)).toBe(0.75);
    });

    it("clamps at both ends rather than wrapping", () => {
      const slowest = PLAYBACK_RATES[0]!;
      const fastest = PLAYBACK_RATES[PLAYBACK_RATES.length - 1]!;
      expect(stepRate(slowest, -1)).toBe(slowest);
      expect(stepRate(fastest, 1)).toBe(fastest);
    });

    it("treats an unknown rate as 1× so a stale value cannot strand the viewer", () => {
      expect(stepRate(3 as PlaybackRate, 1)).toBe(1.25);
    });
  });
});
