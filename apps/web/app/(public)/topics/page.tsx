import type { Metadata } from "next";
import { listTopics } from "@/lib/feeds";
import { TopicIndex } from "@/components/topics/topic-index";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd, pageMetadata, collectionPageLd, breadcrumbLd } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Health topics",
  description:
    "Browse Malayalam health videos by topic — conditions, treatments, lifestyle and herbs.",
  path: "/topics",
});

export default async function TopicsPage() {
  const topics = await listTopics();

  return (
    <div className="flex flex-col gap-6 py-8">
      <JsonLd
        data={[
          collectionPageLd({
            name: "Health topics",
            path: "/topics",
            description: "All health topics covered on Vaidyasala.",
            items: topics.map((t) => ({ slug: t.slug, titleMl: t.nameMl })),
          }),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: "Topics", path: "/topics" },
          ]),
        ]}
      />

      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Topics", path: "/topics" },
        ]}
      />

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Health topics</h1>
        <p className="text-text-dim max-w-2xl text-sm">
          Every condition, treatment and lifestyle subject we cover, in Malayalam.
        </p>
      </header>

      {topics.length === 0 ? (
        <p className="text-text-dim text-sm">No topics yet.</p>
      ) : (
        <TopicIndex topics={topics} />
      )}
    </div>
  );
}
