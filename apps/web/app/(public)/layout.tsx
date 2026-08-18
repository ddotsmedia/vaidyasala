import { TopBar } from "@/components/shell/top-bar";
import { Footer } from "@/components/shell/footer";

/** Public site shell: persistent top bar + footer (§1.4). */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/*
        Skip link (WCAG 2.4.1, Level A). Without it a keyboard or screen-reader
        user tabs through the whole header — logo, search, four nav controls —
        on every page. Visually hidden until focused, then pinned top-left.
      */}
      <a
        href="#main"
        className="bg-surface text-text focus-visible:outline-focus sr-only rounded-md px-4 py-2 text-sm focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus-visible:outline-2"
      >
        Skip to content
      </a>
      <TopBar />
      {/* <main> rather than <div>: the one landmark that lets assistive tech
          jump past the header, and the target of the skip link above. */}
      <main id="main" className="mx-auto min-h-[60dvh] max-w-6xl px-4">
        {children}
      </main>
      <Footer />
    </>
  );
}
