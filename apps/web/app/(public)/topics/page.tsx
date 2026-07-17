import type { Metadata } from "next";
import Link from "next/link";
import { listTopics } from "@/lib/feeds";

export const metadata: Metadata = { title: "Topics" };
export const revalidate = 600;

const KIND_LABEL: Record<string, string> = {
  CONDITION: "Conditions",
  TREATMENT: "Treatments",
  LIFESTYLE: "Lifestyle",
  HERB: "Herbs",
  GENERAL: "General",
};

export default async function TopicsPage() {
  const topics = await listTopics();
  const byKind = new Map<string, typeof topics>();
  for (const t of topics) {
    const arr = byKind.get(t.kind) ?? [];
    arr.push(t);
    byKind.set(t.kind, arr);
  }

  return (
    <div className="flex flex-col gap-8 py-8">
      <h1 className="text-2xl font-semibold">Topics</h1>
      {topics.length === 0 ? (
        <p className="text-text-dim text-sm">No topics yet.</p>
      ) : (
        [...byKind.entries()].map(([kind, items]) => (
          <section key={kind} className="flex flex-col gap-3">
            <h2 className="text-text-dim text-sm font-medium uppercase tracking-wide">
              {KIND_LABEL[kind] ?? kind}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => (
                <Link
                  key={t.slug}
                  href={`/topics/${t.slug}`}
                  className="border-border hover:bg-surface flex items-center justify-between rounded-lg border p-4"
                >
                  <span>
                    <span className="font-ml block font-medium" lang="ml">
                      {t.nameMl}
                    </span>
                    <span className="text-text-dim text-sm">{t.nameEn}</span>
                  </span>
                  <span className="text-text-dim text-xs">{t.videoCount} videos</span>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
