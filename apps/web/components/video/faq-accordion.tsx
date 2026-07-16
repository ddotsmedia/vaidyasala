"use client";
import { formatDuration } from "@vaidyasala/ui";
import { usePlayer } from "./player-context";
import type { WatchFaq } from "@/lib/video";

/** FaqAccordion (§4): each answer with a timestamp renders a "▶ 5:12" seek chip. */
export function FaqAccordion({ faqs }: { faqs: WatchFaq[] }) {
  const { seekTo } = usePlayer();
  if (faqs.length === 0) return null;

  return (
    <section className="flex flex-col gap-2" aria-label="FAQ">
      <h2 className="text-lg font-semibold">Frequently asked</h2>
      <div className="flex flex-col gap-2">
        {faqs.map((f) => (
          <details key={f.id} className="border-border group rounded-lg border p-3">
            <summary className="font-ml cursor-pointer list-none font-medium leading-[1.7] marker:hidden" lang="ml">
              {f.questionMl}
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              <p className="font-ml text-text-dim text-sm leading-[1.8]" lang="ml">
                {f.answerMl}
              </p>
              {f.timestampSec !== null ? (
                <button
                  type="button"
                  onClick={() => seekTo(f.timestampSec!)}
                  className="text-brand self-start text-sm"
                >
                  ▶ {formatDuration(f.timestampSec)}
                </button>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
