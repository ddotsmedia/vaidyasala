"use client";

/**
 * Plausible Analytics event tracking.
 * Events are automatically tracked if window.plausible is available.
 * Fallback: events are logged to console in development.
 */

interface EventProps {
  [key: string]: string | number | boolean;
}

function getPlausible() {
  return typeof window !== "undefined" ? (window as any).plausible : null;
}

export function trackVideoView(videoId: string, title?: string): void {
  const plausible = getPlausible();
  if (plausible) {
    plausible("Video Viewed", { props: { videoId, title: title || videoId } });
  } else if (process.env.NODE_ENV === "development") {
    console.log("[Plausible] Video Viewed", { videoId, title });
  }
}

export function trackSearch(query: string): void {
  const plausible = getPlausible();
  if (plausible) {
    plausible("Search", { props: { query } });
  } else if (process.env.NODE_ENV === "development") {
    console.log("[Plausible] Search", { query });
  }
}

export function trackVideoCompleted(videoId: string, durationSec: number): void {
  const plausible = getPlausible();
  if (plausible) {
    plausible("Video Completed", { props: { videoId, durationSec } });
  } else if (process.env.NODE_ENV === "development") {
    console.log("[Plausible] Video Completed", { videoId, durationSec });
  }
}

export function trackVideoEngagement(videoId: string, percentWatched: number): void {
  const plausible = getPlausible();
  if (plausible) {
    plausible("Video Engagement", { props: { videoId, percentWatched: Math.round(percentWatched) } });
  } else if (process.env.NODE_ENV === "development") {
    console.log("[Plausible] Video Engagement", { videoId, percentWatched });
  }
}

export function trackTopicView(topicSlug: string, topicName: string): void {
  const plausible = getPlausible();
  if (plausible) {
    plausible("Topic Viewed", { props: { topicSlug, topicName } });
  } else if (process.env.NODE_ENV === "development") {
    console.log("[Plausible] Topic Viewed", { topicSlug, topicName });
  }
}

export function trackNewsletterSignup(email?: string): void {
  const plausible = getPlausible();
  if (plausible) {
    plausible("Newsletter Signup", email ? { props: { email } } : {});
  } else if (process.env.NODE_ENV === "development") {
    console.log("[Plausible] Newsletter Signup", { email });
  }
}

export function trackCustomEvent(eventName: string, props?: EventProps): void {
  const plausible = getPlausible();
  if (plausible) {
    plausible(eventName, props ? { props } : {});
  } else if (process.env.NODE_ENV === "development") {
    console.log(`[Plausible] ${eventName}`, props);
  }
}
