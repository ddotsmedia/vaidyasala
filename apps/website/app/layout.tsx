import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vaidyasala - Ayurvedic Health Education',
  description: 'Learn Ayurveda from expert teachers. 500+ educational videos on Ayurvedic health, wellness, and lifestyle.',
  openGraph: {
    title: 'Vaidyasala',
    description: 'Ayurvedic Health Education',
    url: 'https://vaidyasala.com',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-white text-gray-900">
        <nav className="bg-blue-600 text-white py-4">
          <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">Vaidyasala</h1>
            <ul className="flex gap-8">
              <li><a href="/">Home</a></li>
              <li><a href="/blog">Blog</a></li>
              <li><a href="/book-consultation">Book Consultation</a></li>
            </ul>
          </div>
        </nav>
        {children}
        <footer className="bg-gray-800 text-white py-8 mt-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p>&copy; 2024 Vaidyasala. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
