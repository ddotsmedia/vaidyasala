import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await prisma.article.findUnique({ where: { slug: params.slug } });
  if (!article) return {};

  return {
    title: `${article.title} | Vaidyasala Blog`,
    description: article.description,
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = await prisma.article.findUnique({ where: { slug: params.slug } });
  if (!article) notFound();

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
      <p className="text-gray-500 text-sm mb-8">
        {article.publishedAt && new Date(article.publishedAt).toLocaleDateString()}
      </p>
      <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />
    </main>
  );
}
