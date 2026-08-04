import type { MetadataRoute } from "next";

/** PWA manifest (§5, Phase 5). Installable Malayalam health-video app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vaidyasala — Malayalam Health Videos",
    short_name: "Vaidyasala",
    description: "AI-powered Malayalam health video discovery.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    lang: "ml",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
