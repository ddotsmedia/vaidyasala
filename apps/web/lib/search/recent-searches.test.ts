import { beforeEach, describe, expect, it } from "vitest";
import {
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  removeRecentSearch,
  MAX_RECENT,
} from "./recent-searches";

// jsdom-free stub: the module only uses getItem/setItem/removeItem.
function installStorage(): void {
  const store = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  };
}

describe("recent searches", () => {
  beforeEach(() => {
    installStorage();
  });

  it("keeps most recent first", () => {
    addRecentSearch("prameham");
    addRecentSearch("thyroid");
    expect(getRecentSearches()).toEqual(["thyroid", "prameham"]);
  });

  it("caps the list at MAX_RECENT", () => {
    for (let i = 0; i < MAX_RECENT + 4; i += 1) addRecentSearch(`query ${i}`);
    expect(getRecentSearches()).toHaveLength(MAX_RECENT);
  });

  it("re-searching a term reorders instead of duplicating", () => {
    addRecentSearch("prameham");
    addRecentSearch("thyroid");
    addRecentSearch("  PRAMEHAM ");
    const out = getRecentSearches();
    expect(out).toHaveLength(2);
    expect(out[0]).toBe("PRAMEHAM");
  });

  it("ignores queries shorter than two characters", () => {
    addRecentSearch("a");
    addRecentSearch(" ");
    expect(getRecentSearches()).toEqual([]);
  });

  it("removes one entry and clears all", () => {
    addRecentSearch("prameham");
    addRecentSearch("thyroid");
    expect(removeRecentSearch("prameham")).toEqual(["thyroid"]);
    clearRecentSearches();
    expect(getRecentSearches()).toEqual([]);
  });

  it("survives corrupt stored data", () => {
    (globalThis as { window: { localStorage: Storage } }).window.localStorage.setItem(
      "vs:search:recent",
      "{not json",
    );
    expect(getRecentSearches()).toEqual([]);
  });
});
