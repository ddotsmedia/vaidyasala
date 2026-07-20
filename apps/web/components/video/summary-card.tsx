import Link from "next/link";
import { formatDuration } from "@vaidyasala/ui";

/** SummaryCard (§6.1): AI summary + meta, visible above the fold. */
export function SummaryCard({
  summaryMl,
  durationSec,
  topic,
  publishedAt,
}: {
  summaryMl: string | null;
  durationSec: number;
  topic: { slug: string; nameMl: string } | null;
  publishedAt: string | null;
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
      </div>
      {summaryMl ? (
        <p className="font-ml text-[15px] leading-[1.8]" lang="ml" data-speakable>
          {summaryMl}
        </p>
      ) : null}
    </div>
  );
}
