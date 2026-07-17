import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@vaidyasala/ui", "@vaidyasala/core", "@vaidyasala/db"],
  // Enabled in Phase 3B now that the public routes exist.
  typedRoutes: true,
  images: {
    // R2 media loader is configured in Phase 3D; placeholder remote pattern.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
