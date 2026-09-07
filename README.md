# Vaidyasala - Ayurvedic Health Education Platform

A modern, SEO-optimized Next.js website showcasing 560+ YouTube educational videos, blog articles, and consultation booking with Stripe integration.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (`npm install -g pnpm`)

### Development
```bash
cd apps/website
pnpm install
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
pnpm build
pnpm start
```

## 📋 Features

- **Homepage**: Responsive video grid (100+ videos visible)
- **Video Pages**: Individual YouTube embeds with metadata
- **Blog System**: SEO-optimized articles with Markdown support
- **Consultation Booking**: Date/time picker + Stripe payment integration
- **YouTube Sync**: API endpoint to auto-import channel videos
- **SEO Ready**: Sitemap, robots.txt, meta tags, structured data
- **Mobile First**: Fully responsive design
- **Type Safe**: Full TypeScript implementation

## 🎬 YouTube Integration

Sync videos from channel UCADw8vrx5oszMLul5PHzCqA:

```bash
curl -X GET "http://localhost:3000/api/videos/sync" \
  -H "X-Admin-Password: Admin@Vaidyasala2024"
```

## 💳 Stripe Setup

Update `.env.local` with your keys:
```
STRIPE_PUBLIC_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
```

## 📁 Project Structure

```
apps/website/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── blog/              # Blog pages
│   ├── videos/            # Video pages
│   └── page.tsx           # Homepage
├── components/            # React components
├── lib/                   # Utilities
├── prisma/               # Database
└── public/               # Static assets
```

## 🗄️ Database

SQLite (file: `prisma/dev.db`)

Models:
- `Video`: YouTube video metadata
- `Article`: Blog articles
- `Consultation`: Booking requests

Run migrations:
```bash
pnpm prisma migrate dev
pnpm prisma db seed
```

## 🔑 Environment Variables

```env
DATABASE_URL=file:./prisma/dev.db
YOUTUBE_API_KEY=AIzaSyA3SVk-gYWASnuP1ItyjI9UJgJSpSpQSv0
YOUTUBE_CHANNEL_ID=UCADw8vrx5oszMLul5PHzCqA
NEXT_PUBLIC_SITE_URL=https://vaidyasala.com
STRIPE_PUBLIC_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
ADMIN_PASSWORD=Admin@Vaidyasala2024
```

## 🚢 Deployment

### Vercel
```bash
vercel --prod
```

### Docker
```bash
docker build -t vaidyasala-web .
docker run -d -p 3000:3000 --env-file .env.local vaidyasala-web
```

### Railway/Render
Connect GitHub repo and set environment variables in UI.

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/videos/sync` | GET | Sync YouTube channel videos |
| `/api/consultations` | POST | Create consultation booking |
| `/api/consultations` | GET | List bookings |
| `/api/articles` | POST | Create blog article |
| `/api/articles` | GET | List articles |

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: SQLite + Prisma
- **Styling**: Tailwind CSS
- **Payments**: Stripe
- **API**: googleapis (YouTube)
- **Package Manager**: pnpm

## 📈 Performance

- Build: ~101kB First Load JS
- Static pages: Pre-rendered
- Dynamic routes: Server-rendered on demand
- Images: Optimized with Next.js Image

## ✅ Checklist

- [x] Homepage with video grid
- [x] Individual video pages
- [x] Blog articles
- [x] Consultation booking
- [x] Stripe integration
- [x] YouTube sync API
- [x] Sitemap & robots.txt
- [x] Mobile responsive
- [x] Type safety
- [x] Build optimized

## 📝 License

Private - Vaidyasala 2024

## 👤 Contact

Email: mammikutty@al-watan.ae
