import type { Metadata } from "next";
import { Toaster } from "@vaidyasala/ui";
import { fontVariables } from "@/lib/fonts";
import { ThemeScript } from "@/components/shell/theme-switcher";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Vaidyasala",
    template: "%s · Vaidyasala",
  },
  description:
    "AI-powered Malayalam health video discovery. Find trusted answers from Malayalam medical videos.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ml" className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
