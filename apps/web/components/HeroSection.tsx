import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import type { HeroVideo } from "@/lib/feeds";

/**
 * Enhanced hero section with stunning visuals.
 * Features: gradient overlay, centered play button with glow, metadata badges.
 */
export function HeroSection({ video }: { video: HeroVideo }) {
  const heroHeights = {
    mobile: "h-[250px]",
    tablet: "h-[350px]",
    desktop: "h-[400px]",
  };

  return (
    <section aria-labelledby="hero-title" className="w-full">
      <Link
        href={`/watch/${video.slug}`}
        className="group focus-visible:outline-focus block overflow-hidden rounded-2xl focus-visible:outline-2"
      >
        {/* Hero container with responsive heights */}
        <div
          className={`relative aspect-video w-full sm:aspect-auto ${heroHeights.mobile} sm:${heroHeights.tablet} lg:${heroHeights.desktop}`}
        >
          {/* Background image */}
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
            className="object-cover"
          />

          {/* Gradient overlay: stronger at bottom, transparent at top */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/80" />

          {/* Featured badge - top-left */}
          <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
            <span className="bg-vaid-red inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase text-white">
              FEATURED
            </span>
          </div>

          {/* Duration badge - top-right */}
          <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
            <span className="bg-vaid-black/80 backdrop-blur inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tabular-nums text-white">
              {formatDuration(video.durationSec)}
            </span>
          </div>

          {/* Centered play button - desktop only */}
          <div className="pointer-events-none absolute inset-0 hidden place-items-center sm:grid">
            <div className="relative grid place-items-center">
              {/* Glow effect */}
              <div className="absolute inset-0 scale-125 rounded-full bg-vaid-red/20 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              {/* Play button */}
              <div className="relative grid size-20 place-items-center rounded-full bg-vaid-red/90 backdrop-blur transition-transform duration-300 group-hover:scale-110">
                <Play className="size-8 fill-white text-white" aria-hidden />
              </div>
            </div>
          </div>

          {/* Bottom content - creator, title, description */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 sm:gap-4 sm:p-6">
            {/* Title */}
            <h1
              id="hero-title"
              className="font-ml line-clamp-2 text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl"
              lang="ml"
            >
              {video.titleMl}
            </h1>

            {/* Description */}
            {video.blurb ? (
              <p
                className="font-ml line-clamp-2 max-w-3xl text-sm leading-relaxed text-white/90 sm:text-base sm:line-clamp-3"
                lang="ml"
              >
                {video.blurb}
              </p>
            ) : null}

            {/* Watch Now button - mobile and desktop */}
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                className="bg-vaid-red hover:bg-vaid-red/90 focus-visible:outline-focus inline-flex min-h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition-all duration-200 focus-visible:outline-2 sm:min-h-12 sm:px-8 sm:text-base"
              >
                <Play className="size-4 fill-current sm:size-5" aria-hidden />
                Watch Now
              </button>
              <span className="text-xs text-white/70 tabular-nums sm:text-sm">
                {video.durationSec}s
              </span>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}

/**
 * Format duration in seconds to MM:SS or H:MM:SS format.
 * BLOCKED: This duplicates formatDuration from @vaidyasala/ui.
 * Should import and use that instead.
 */
function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return h > 0 ? `${h}:${mm}:${String(sec).padStart(2, "0")}` : `${mm}:${String(sec).padStart(2, "0")}`;
}
