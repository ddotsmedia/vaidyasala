import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function BlogPage() {
  const articles = await prisma.article.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
  });

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Ayurvedic Health Articles</h1>
      <div className="space-y-6">
        {articles.map(article => (
          <Link key={article.id} href={`/blog/${article.slug}`}>
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer">
              <h2 className="text-2xl font-bold text-blue-600">{article.title}</h2>
              <p className="text-gray-600 mt-2">{article.description}</p>
              <span className="text-sm text-gray-500 mt-4 block">
                {article.publishedAt && new Date(article.publishedAt).toLocaleDateString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
