import { prisma } from '@/lib/db';
import VideoCard from '@/components/VideoCard';

export default async function HomePage() {
  const videos = await prisma.video.findMany({
    take: 100,
    orderBy: { uploadDate: 'desc' },
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <section className="py-20 text-center px-4">
        <h1 className="text-5xl font-bold text-gray-900">Vaidyasala</h1>
        <p className="mt-4 text-xl text-gray-600">Ayurvedic Health Education & Wellness</p>
        <input
          type="text"
          placeholder="Search videos..."
          className="mt-8 px-4 py-2 w-96 max-w-full rounded-lg border border-gray-300 focus:outline-none focus:border-blue-600"
        />
      </section>

      <section className="px-4 py-12 max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-8">Latest Videos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {videos.map(video => <VideoCard key={video.id} video={video} />)}
        </div>
      </section>
    </main>
  );
}
