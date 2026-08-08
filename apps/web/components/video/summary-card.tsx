import Link from "next/link";
import { formatDuration } from "@vaidyasala/ui";

/** Compact view count: 1.2K / 3.4M. */
function formatViews(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0)}M`;
}

/** SummaryCard (§6.1): AI summary + meta, visible above the fold. */
export function SummaryCard({
  summaryMl,
  summaryEn,
  durationSec,
  topic,
  publishedAt,
  viewCount,
}: {
  summaryMl: string | null;
  summaryEn?: string | null;
  durationSec: number;
  topic: { slug: string; nameMl: string } | null;
  publishedAt: string | null;
  viewCount?: number;
}) {
  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-4">
      <div className="text-text-dim flex flex-wrap items-center gap-2 text-sm">
        {topic ? (
          <Link href={`/topics/${topic.slug}`} className="text-brand font-ml" lang="ml">
            {topic.nameMl}
          </Link>
        ) : null}
        <span>· {formatDuration(durationSec)}</span>
        {publishedAt ? <span>· {publishedAt.slice(0, 10)}</span> : null}
        {typeof viewCount === "number" ? <span>· {formatViews(viewCount)} views</span> : null}
      </div>
      {summaryMl ? (
        <p className="font-ml text-[15px] leading-[1.8]" lang="ml" data-speakable>
          {summaryMl}
        </p>
      ) : null}
      {/* A plain <details> keeps this a server component and works without JS.
          English is secondary here — Malayalam stays the default reading. */}
      {summaryEn ? (
        <details className="group">
          <summary className="text-brand focus-visible:outline-focus min-h-11 cursor-pointer list-none text-sm focus-visible:outline-2">
            <span className="group-open:hidden">Read summary in English</span>
            <span className="hidden group-open:inline">Hide English summary</span>
          </summary>
          <p className="text-text-dim mt-2 text-[15px] leading-[1.8]" lang="en">
            {summaryEn}
          </p>
        </details>
      ) : null}
    </div>
  );
}
