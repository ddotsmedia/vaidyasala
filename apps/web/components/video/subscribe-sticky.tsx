"use client";
import { SubscribeCTA } from "@vaidyasala/ui";
import { trackSubscribeClick } from "@/lib/analytics";

interface Props {
  channelUrl: string;
  subscriberCount?: number;
  videoId: string;
}

/**
 * Always-available Subscribe CTA.
 *
 * Deliberately separate from SubscribeOverlay, which stays gated at 75% watched
 * per §6.1 ("earn it") and is the full-width banner at that moment. These are the
 * quieter persistent affordance for a viewer who decides early.
 *
 * Two exports rather than one component with internal breakpoints, because the
 * desktop copy belongs inside the sidebar's flow while the mobile copy must be
 * fixed to the viewport — different parents, so different components.
 */

/** Mobile: bar pinned above the safe area. Hidden from lg up. */
export function SubscribeStickyBar({ channelUrl, subscriberCount, videoId }: Props) {
  return (
    <div
      className="border-border bg-bg/95 fixed inset-x-0 bottom-0 z-20 border-t px-4 pt-3 backdrop-blur lg:hidden"
      // Clears the iOS home indicator.
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* mr-16 keeps clear of the floating like/save buttons on the right. */}
      <div className="mr-16 flex items-center justify-between gap-3">
        <span className="font-ml text-text-dim min-w-0 truncate text-sm leading-[1.7]" lang="ml">
          വൈദ്യശാല
        </span>
        <SubscribeCTA
          channelUrl={channelUrl}
          subscriberCount={subscriberCount}
          variant="inline"
          onSubscribeClick={() => trackSubscribeClick(videoId, "sticky-bar")}
        />
      </div>
    </div>
  );
}

/** Desktop: rides along the sidebar as it scrolls. */
export function SubscribeStickyAside({ channelUrl, subscriberCount, videoId }: Props) {
  return (
    <div className="sticky top-20">
      <SubscribeCTA
        channelUrl={channelUrl}
        subscriberCount={subscriberCount}
        variant="banner"
        onSubscribeClick={() => trackSubscribeClick(videoId, "sticky-aside")}
      />
    </div>
  );
}
