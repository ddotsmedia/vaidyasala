import type { Metadata } from "next";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

/** Offline fallback served by the service worker when a page isn't cached. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">You're offline</h1>
      <p className="text-text-dim text-sm">
        This page isn't available offline. Reconnect and try again — recently visited pages still
        work.
      </p>
    </main>
  );
}
