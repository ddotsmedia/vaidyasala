import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { VideoCard } from "@vaidyasala/ui";
import { getArticleBySlug, publishedArticleSlugs } from "@/lib/feeds";
import { MedicalDisclaimer } from "@/components/seo/medical-disclaimer";
import {
  JsonLd,
  pageMetadata,
  ogImageUrl,
  articleLd,
  medicalWebPageLd,
  breadcrumbLd,
} from "@/lib/seo";

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return (await publishedArticleSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Not found" };
  return pageMetadata({
    title: article.titleMl,
    description: article.bodyMl.replace(/[#*_>[\]()]/g, "").slice(0, 200),
    path: `/articles/${article.slug}`,
    ogImage: article.sourceVideoSlug ? ogImageUrl(article.sourceVideoSlug) : undefined,
    type: "article",
    publishedTime: article.createdAt,
  });
}

// MDX element mapping: Malayalam typography + Next links for in-body cross-links.
const mdxComponents = {
  h2: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="font-ml mt-6 text-xl font-semibold" lang="ml" {...p} />
  ),
  h3: (p: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="font-ml mt-4 text-lg font-semibold" lang="ml" {...p} />
  ),
  p: (p: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="font-ml mt-3 leading-[1.9]" lang="ml" {...p} />
  ),
  ul: (p: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="font-ml mt-3 list-disc pl-6 leading-[1.9]" lang="ml" {...p} />
  ),
  a: (p: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="text-brand hover:underline" {...p} />
  ),
};

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 py-8">
      <JsonLd
        data={[
          articleLd({
            slug: article.slug,
            titleMl: article.titleMl,
            publishedAt: article.createdAt,
            updatedAt: article.updatedAt,
          }),
          medicalWebPageLd({
            name: article.titleMl,
            path: `/articles/${article.slug}`,
            lastReviewed: article.updatedAt,
            speakable: true,
          }),
          breadcrumbLd([
            { name: "Home", path: "/" },
            { name: article.titleMl, path: `/articles/${article.slug}` },
          ]),
        ]}
      />
      <h1 className="font-ml text-3xl font-semibold leading-[1.4]" lang="ml" data-speakable>
        {article.titleMl}
      </h1>
      <p className="text-text-dim text-sm">{article.readingMin} min read</p>

      {/* Source-video card above the fold (§1.3). */}
      {article.sourceVideo ? (
        <div className="border-border bg-surface flex flex-col gap-2 rounded-xl border p-4">
          <p className="text-text-dim text-sm">Watch the source video</p>
          <Link href={`/watch/${article.sourceVideo.slug}`} className="block max-w-md">
            <VideoCard video={article.sourceVideo} size="md" />
          </Link>
        </div>
      ) : null}

      <div className="prose-none">
        <MDXRemote source={article.bodyMl} components={mdxComponents} />
      </div>

      <MedicalDisclaimer lastReviewed={article.updatedAt} />
    </article>
  );
}
