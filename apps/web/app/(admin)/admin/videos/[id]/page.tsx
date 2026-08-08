import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@vaidyasala/ui";
import { getVideoForReview } from "@/lib/admin/data";
import { wordDiff } from "@/lib/diff";
import { PublishControls } from "@/components/admin/publish-button";

export const metadata: Metadata = { title: "Review" };
export const dynamic = "force-dynamic";

interface Takeaway {
  ml?: string;
  en?: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getVideoForReview(id);
  if (!video) notFound();

  const raw = video.transcript?.rawMl ?? "";
  const corrected = video.transcript?.correctedMl ?? "";
  const diff = raw && corrected ? wordDiff(raw, corrected) : [];
  const takeaways = (video.enrichment?.keyTakeaways as Takeaway[] | null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-ml text-xl font-semibold leading-relaxed" lang="ml">
            {video.titleMl}
          </h1>
          <div className="text-text-dim mt-1 flex items-center gap-2 text-sm">
            <Badge variant="outline">{video.status}</Badge>
            {video.qualityScore !== null ? <span>quality {video.qualityScore.toFixed(2)}</span> : null}
            {video.primaryTopic ? <span>· {video.primaryTopic.nameMl}</span> : null}
          </div>
        </div>
        <PublishControls
          videoId={video.id}
          status={video.status}
          featured={video.featuredAt !== null}
        />
      </header>

      <Section title="Transcript diff (raw → corrected)">
        {diff.length === 0 ? (
          <p className="text-text-dim text-sm">No corrected transcript yet.</p>
        ) : (
          <p className="font-ml text-sm leading-[1.9]" lang="ml">
            {diff.map((part, i) =>
              part.type === "same" ? (
                <span key={i}>{part.value}</span>
              ) : part.type === "add" ? (
                <span key={i} className="rounded bg-green-500/20 text-green-400">
                  {part.value}
                </span>
              ) : (
                <span key={i} className="rounded bg-red-500/20 text-red-400 line-through">
                  {part.value}
                </span>
              ),
            )}
          </p>
        )}
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Summary">
          <p className="font-ml text-sm leading-[1.8]" lang="ml">
            {video.enrichment?.summaryMl ?? "—"}
          </p>
          <p className="text-text-dim text-sm">{video.enrichment?.summaryEn ?? ""}</p>
        </Section>

        <Section title="Key takeaways">
          {takeaways.length === 0 ? (
            <p className="text-text-dim text-sm">—</p>
          ) : (
            <ul className="list-disc pl-5 text-sm">
              {takeaways.map((t, i) => (
                <li key={i} className="font-ml leading-[1.8]" lang="ml">
                  {t.ml}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title={`FAQs (${video.faqs.length})`}>
        {video.faqs.length === 0 ? (
          <p className="text-text-dim text-sm">—</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {video.faqs.map((f) => (
              <li key={f.id}>
                <p className="font-ml text-sm font-medium" lang="ml">
                  {f.questionMl}
                  {f.timestampSec !== null ? (
                    <span className="text-text-dim ml-2 text-xs">▶ {f.timestampSec}s</span>
                  ) : null}
                </p>
                <p className="font-ml text-text-dim text-sm leading-[1.8]" lang="ml">
                  {f.answerMl}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Chapters">
        {video.chapters.length === 0 ? (
          <p className="text-text-dim text-sm">—</p>
        ) : (
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {video.chapters.map((c) => (
              <li key={c.id} className="font-ml" lang="ml">
                <span className="text-text-dim tabular-nums">{c.startSec}s</span> · {c.titleMl}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Article draft (MDX)">
        {video.article ? (
          <>
            <p className="font-ml text-sm font-medium" lang="ml">
              {video.article.titleMl}{" "}
              <span className="text-text-dim text-xs">· {video.article.readingMin} min</span>
            </p>
            <pre className="border-border bg-bg max-h-96 overflow-auto rounded border p-3 text-xs whitespace-pre-wrap">
              {video.article.bodyMl}
            </pre>
          </>
        ) : (
          <p className="text-text-dim text-sm">No article draft.</p>
        )}
      </Section>
    </div>
  );
}
