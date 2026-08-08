import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@vaidyasala/ui", "@vaidyasala/core", "@vaidyasala/db"],
  // Enabled in Phase 3B now that the public routes exist.
  typedRoutes: true,
  experimental: {
    // Rewrite barrel imports from our design system + icon lib to direct module
    // paths so unused members (e.g. cmdk via SearchOmnibox, Motion) never enter
    // the shared chunk (§3D JS budget).
    optimizePackageImports: ["@vaidyasala/ui", "lucide-react"],
  },
  images: {
    // Remote thumbnails (YouTube + R2). AVIF/WebP negotiated by next/image.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

// Source-map upload only happens when a SENTRY_AUTH_TOKEN exists, so local and CI
// builds stay offline and fast. Everything else here is build-time wiring that is
// inert without a DSN.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // Route browser SDK traffic through our origin so ad-blockers do not eat the
  // error reports we most want (mobile Safari + uBlock is a common combination).
  tunnelRoute: "/monitoring",
  webpack: { treeshake: { removeDebugLogging: true } },
  telemetry: false,
});
