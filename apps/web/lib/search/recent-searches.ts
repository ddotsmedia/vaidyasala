"use client";

/**
 * Recent searches, kept on the device (§14).
 *
 * localStorage rather than the database: search history is per-device, most
 * visitors here are anonymous, and what someone types into a health search box
 * is sensitive enough that keeping it off the server is the better default.
 */

const KEY = "vs:search:recent";
export const MAX_RECENT = 5;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((q): q is string => typeof q === "string").slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function write(list: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch {
    /* private mode or quota — history is a convenience, never a hard failure */
  }
}

export function getRecentSearches(): string[] {
  return read();
}

/**
 * Record a query, most recent first. Case/whitespace-insensitive de-duplication
 * so retyping the same term reorders it rather than filling the list with
 * near-identical entries.
 */
export function addRecentSearch(query: string): string[] {
  const q = query.trim();
  if (q.length < 2) return read();
  const key = q.toLocaleLowerCase();
  const next = [q, ...read().filter((r) => r.trim().toLocaleLowerCase() !== key)];
  write(next);
  return next.slice(0, MAX_RECENT);
}

export function removeRecentSearch(query: string): string[] {
  const key = query.trim().toLocaleLowerCase();
  const next = read().filter((r) => r.trim().toLocaleLowerCase() !== key);
  write(next);
  return next;
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing sensible to do */
  }
}
