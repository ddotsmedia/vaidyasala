import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopicBySlug, publishedTopicSlugs } from "@/lib/feeds";
import { safeStaticParams } from "@/lib/static-params";
import { TopicVideoBrowser } from "@/components/topics/topic-video-browser";
import { CategoryGrid } from "@/components/category-grid";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { MedicalDisclaimer } from "@/components/seo/medical-disclaimer";
import {
  JsonLd,
  pageMetadata,
  collectionPageLd,
  medicalConditionLd,
  breadcrumbLd,
} from "@/lib/seo";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return safeStaticParams(
    async () => (await publishedTopicSlugs()).map((slug) => ({ slug })),
    "topics",
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic) return { title: "Not found" };
  return pageMetadata({
    title: `${topic.nameEn} · ${topic.nameMl}`,
    description: topic.descriptionMl ?? `${topic.nameEn} health videos in Malayalam.`,
    path: `/topics/${topic.slug}`,
  });
}

export default async function TopicHubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic) notFound();

  const isCondition = topic.kind === "CONDITION";

  return (
    <div className="flex flex-col gap-10 py-8">
      <JsonLd
        data={[
          collectionPageLd({
            name: `${topic.nameEn} · ${topic.nameMl}`,
            path: `/topics/${topic.slug}`,
            description: topic.descriptionMl,
            items: topic.videos.map((v) => ({ slug: v.slug, titleMl: v.titleMl })),
          }),
          ...(isCondition ? [medicalConditionLd(topic.nameMl, topic.nameEn)] : []),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Topics", path: "/topics" },
            { name: topic.nameMl, path: `/topics/${topic.slug}` },
          ]),
        ]}
      />
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Topics", path: "/topics" },
          { name: topic.nameMl, path: `/topics/${topic.slug}`, lang: "ml" },
        ]}
      />

      <header className="flex flex-col gap-2">
        <p className="text-brand text-sm">{topic.nameEn}</p>
        <h1 className="font-ml text-3xl font-semibold" lang="ml">
          {topic.nameMl}
        </h1>
        {topic.descriptionMl ? (
          <p className="font-ml text-text-dim max-w-2xl leading-[1.8]" lang="ml">
            {topic.descriptionMl}
          </p>
        ) : null}
        {topic.ayurconnectUrl ? (
          <a
            href={topic.ayurconnectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand text-sm hover:underline"
          >
            Related on AyurConnect →
          </a>
        ) : null}
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Videos</h2>
        <TopicVideoBrowser videos={topic.videos} />
      </section>

      {/* Related topics (§1.3 internal-link topology) — real crawlable links,
          ranked by shared videos. */}
      {topic.relatedTopics.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Related topics</h2>
          <CategoryGrid topics={topic.relatedTopics} limit={5} showEmpty />
        </section>
      ) : null}

      {topic.articles.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Articles</h2>
          <ul className="flex flex-col gap-2">
            {topic.articles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/articles/${a.slug}`}
                  className="border-border hover:bg-surface flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="font-ml" lang="ml">
                    {a.titleMl}
                  </span>
                  <span className="text-text-dim text-xs">{a.readingMin} min</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {topic.faqs.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Frequently asked</h2>
          <div className="flex flex-col gap-2">
            {topic.faqs.map((f) => (
              <details key={f.id} className="border-border rounded-lg border p-3">
                <summary className="font-ml cursor-pointer font-medium" lang="ml">
                  {f.questionMl}
                </summary>
                <p className="font-ml text-text-dim mt-2 text-sm leading-[1.8]" lang="ml">
                  {f.answerMl}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <MedicalDisclaimer />
    </div>
  );
}
