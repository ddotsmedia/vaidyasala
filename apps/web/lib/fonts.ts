import { Inter, Anek_Malayalam, Noto_Serif_Malayalam } from "next/font/google";

/**
 * Font strategy (§5.3): variable fonts, subset per script so Latin pages don't
 * pay the Malayalam cost, font-display swap with size-adjusted fallback metrics
 * (next/font emits `adjustFontFallback` automatically → zero CLS). Family names
 * are exposed as the CSS vars the design tokens consume.
 */
export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans-src",
  display: "swap",
});

export const fontMl = Anek_Malayalam({
  subsets: ["malayalam", "latin"],
  variable: "--font-ml-src",
  display: "swap",
});

export const fontSerifMl = Noto_Serif_Malayalam({
  subsets: ["malayalam"],
  variable: "--font-serif-ml-src",
  display: "swap",
  preload: false,
});

export const fontVariables = `${fontSans.variable} ${fontMl.variable} ${fontSerifMl.variable}`;
