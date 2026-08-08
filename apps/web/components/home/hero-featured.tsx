import Link from "next/link";
import Image from "next/image";
import { Play } from "lucide-react";
import { formatDuration } from "@vaidyasala/ui";
import type { HeroVideo } from "@/lib/feeds";

/**
 * Featured hero (§1.1). One tap anywhere on it lands on the watch page.
 *
 * Server component on purpose: this is the LCP element, so it ships as HTML with
 * a `priority` image and no client JS in the critical path. The overlay is a
 * gradient rather than a translucent panel so the thumbnail stays readable at
 * phone width, where the text occupies most of the frame.
 */
export function HeroFeatured({ video }: { video: HeroVideo }) {
  return (
    <section aria-labelledby="hero-title">
      <Link
        href={`/watch/${video.slug}`}
        className="group focus-visible:outline-focus block overflow-hidden rounded-2xl focus-visible:outline-2"
      >
        <div className="relative aspect-video w-full sm:aspect-[21/9]">
          <Image
            src={video.thumbnailUrl}
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
          />

          {/* Bottom-weighted scrim: dark enough for AA text at the base, clear at
              the top so the frame is still visible. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />

          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4 sm:p-6">
            <span className="text-brand text-xs font-semibold uppercase tracking-wide">
              Featured
            </span>
            <h1
              id="hero-title"
              className="font-ml line-clamp-2 text-xl font-semibold leading-[1.5] text-white sm:text-3xl"
              lang="ml"
            >
              {video.titleMl}
            </h1>
            {video.blurb ? (
              <p
                className="font-ml line-clamp-2 max-w-2xl text-sm leading-[1.7] text-white/80 sm:line-clamp-3"
                lang="ml"
              >
                {video.blurb}
              </p>
            ) : null}
            <div className="mt-1 flex items-center gap-3">
              <span className="bg-cta text-cta-fg inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-transform group-hover:scale-[1.02]">
                <Play className="size-4 fill-current" aria-hidden />
                Watch now
              </span>
              <span className="text-xs tabular-nums text-white/70">
                {formatDuration(video.durationSec)}
              </span>
            </div>
          </div>

          {/* Centre play affordance — desktop only; on mobile the button above
              is the target and a second one just competes with it. */}
          <span className="pointer-events-none absolute inset-0 hidden place-items-center sm:grid">
            <span className="grid size-16 place-items-center rounded-full bg-black/40 backdrop-blur transition-transform group-hover:scale-110">
              <Play className="size-7 translate-x-0.5 fill-white text-white" aria-hidden />
            </span>
          </span>
        </div>
      </Link>
    </section>
  );
}
