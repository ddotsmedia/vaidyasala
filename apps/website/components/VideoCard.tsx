'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Video {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  duration: number;
}

export default function VideoCard({ video }: { video: Video }) {
  return (
    <Link href={`/videos/${video.youtubeId}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer">
        <div className="relative w-full h-48 bg-gray-200">
          <Image src={video.thumbnail} alt={video.title} fill className="rounded-t-lg object-cover" />
        </div>
        <div className="p-4">
          <h3 className="font-bold text-lg line-clamp-2">{video.title}</h3>
          <p className="text-sm text-gray-500 mt-2">{video.duration} min</p>
          <a
            href={`https://youtube.com/watch?v=${video.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-3 block bg-red-600 text-white px-4 py-2 rounded text-center hover:bg-red-700 transition"
          >
            Watch on YouTube
          </a>
        </div>
      </div>
    </Link>
  );
}
