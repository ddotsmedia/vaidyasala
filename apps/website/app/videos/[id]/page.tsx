import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const video = await prisma.video.findUnique({ where: { youtubeId: params.id } });
  if (!video) return {};

  return {
    title: `${video.title} | Vaidyasala`,
    description: video.description.slice(0, 160),
    openGraph: {
      title: video.title,
      description: video.description,
      images: [{ url: video.thumbnail }],
    },
  };
}

export default async function VideoPage({ params }: Props) {
  const video = await prisma.video.findUnique({ where: { youtubeId: params.id } });
  if (!video) notFound();

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <div className="aspect-video bg-black rounded-lg mb-8 overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${video.youtubeId}`}
          className="w-full h-full"
          allowFullScreen
          title={video.title}
        />
      </div>
      <h1 className="text-4xl font-bold mb-4">{video.title}</h1>
      <p className="text-gray-600 mb-4 whitespace-pre-wrap">{video.description}</p>
      <a
        href={`https://youtube.com/watch?v=${video.youtubeId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition"
      >
        Watch on YouTube
      </a>
    </main>
  );
}
