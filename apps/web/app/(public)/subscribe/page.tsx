import type { Metadata } from "next";
import { SubscribeCTA } from "@vaidyasala/ui";

export const metadata: Metadata = { title: "Subscribe" };

const CHANNEL_URL = "https://www.youtube.com/@vaidyasala?sub_confirmation=1";

const BENEFITS = [
  "New Malayalam health videos every week",
  "Trusted, doctor-reviewed information",
  "Chapters, transcripts and summaries for every video",
];

/** Dedicated conversion page — all CTAs funnel here (§1.1). */
export default function SubscribePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-3xl font-semibold">Subscribe to Vaidyasala</h1>
      <p className="text-text-dim">
        Join our YouTube channel for trusted Malayalam health videos.
      </p>
      <ul className="flex flex-col gap-2 text-left">
        {BENEFITS.map((b) => (
          <li key={b} className="flex items-center gap-2">
            <span className="text-brand" aria-hidden>
              ✓
            </span>
            {b}
          </li>
        ))}
      </ul>
      <SubscribeCTA channelUrl={CHANNEL_URL} variant="inline" />
    </div>
  );
}
