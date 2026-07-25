"use client";
import dynamic from "next/dynamic";

/**
 * Lazy wrapper for the ⌘K command palette. cmdk (~60KB gz) is the single
 * biggest client dependency and it sits in the persistent top bar on every
 * page — so we split it into its own chunk and only load it the first time the
 * user actually opens search (see top-bar `everOpened` gate). Keeps it out of
 * the initial JS budget on /watch and every other route (§11).
 */
export const SearchOmniboxLazy = dynamic(
  () => import("@vaidyasala/ui").then((m) => ({ default: m.SearchOmnibox })),
  { ssr: false },
);
