import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@vaidyasala/ui", "@vaidyasala/core", "@vaidyasala/db"],
  // Re-enabled in Phase 3B once the public routes exist (avoids stubbing them early).
  typedRoutes: false,
  images: {
    // R2 media loader is configured in Phase 3D; placeholder remote pattern.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
