import type { NextConfig } from "next";

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

export default nextConfig;
