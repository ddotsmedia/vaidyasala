import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        "vaid-black": "#0f0f0f",
        "vaid-charcoal": "#1a1a1a",
        "vaid-gray-dark": "#2a2a2a",
        "vaid-gray-light": "#e0e0e0",
        "vaid-red": "#ef4444",
      },
      animation: {
        "fade-in": "fadeIn 300ms ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
};

export default config;
