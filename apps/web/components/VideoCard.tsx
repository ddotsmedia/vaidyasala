import Link from "next/link";
import { Play } from "lucide-react";
import { VideoCard as UIVideoCard, type VideoCardData, type VideoCardSize } from "@vaidyasala/ui";
import { CARD_SIZES } from "@/lib/thumbnail";

/**
 * Enhanced video card component with hover effects and improved visual design.
 * Wraps the @vaidyasala/ui VideoCard with app-level styling and interactivity.
 */
export interface EnhancedVideoCardProps {
  video: VideoCardData;
  size?: VideoCardSize;
  imageSizes?: string;
}

export function VideoCard({ video, size = "md", imageSizes }: EnhancedVideoCardProps) {
  return (
    <Link
      href={`/watch/${video.slug}`}
      className="group block focus-visible:outline-focus rounded-lg focus-visible:outline-2"
    >
      <div className="relative transition-transform duration-200 group-hover:scale-[1.05]">
        {/* Enhanced card with shadow that expands on hover */}
        <div className="relative rounded-lg shadow-md transition-shadow duration-200 group-hover:shadow-2xl">
          {/* Base card from UI package */}
          <UIVideoCard
            video={video}
            size={size}
            imageSizes={imageSizes ?? CARD_SIZES[size]}
            className="!gap-0"
          />

          {/* Play button overlay - visible on hover (desktop) */}
          <div className="pointer-events-none absolute inset-0 hidden place-items-center rounded-lg group-hover:grid">
            <div className="relative grid place-items-center">
              {/* Glow effect background */}
              <div className="absolute inset-0 scale-125 rounded-full bg-vaid-red/30 blur-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              {/* Play button */}
              <div className="relative grid size-16 place-items-center rounded-full bg-vaid-red/90 backdrop-blur transition-transform duration-200 group-hover:scale-110">
                <Play className="size-6 fill-white text-white" aria-hidden />
              </div>
            </div>
          </div>
        </div>

        {/* Metadata section below card */}
        <div className="mt-2 flex flex-col gap-1 px-1">
          {/* Title is handled by UIVideoCard */}

          {/* BLOCKED: Additional metadata would go here:
              - Creator name
              - Star rating (requires ratings data in VideoCardData)
              - View count (requires analytics aggregation)
              - Published date (publishedAt exists but not in VideoCardData)
              - Action buttons (Save, Share)

              These would need:
              1. VideoCardData type extension to include: views, rating, createdBy, publishedAt
              2. Data fetching update in lib/feeds.ts to select these fields
              3. UI extensions in this component
          */}
        </div>
      </div>
    </Link>
  );
}

/**
 * Export size constants for grid layouts
 * Mobile (1 col): full width
 * Tablet (2-3 cols): divide viewport
 * Desktop (4 cols): ~25% each
 */
export const VIDEO_CARD_GRID_CONFIG = {
  mobile: "grid-cols-1 gap-4",
  tablet: "grid-cols-2 gap-4 sm:grid-cols-3",
  desktop: "grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4",
  hero: "gap-4",
} as const;
