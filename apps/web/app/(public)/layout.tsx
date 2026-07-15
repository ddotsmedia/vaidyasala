import { TopBar } from "@/components/shell/top-bar";
import { Footer } from "@/components/shell/footer";

/** Public site shell: persistent top bar + footer (§1.4). */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      <div className="mx-auto min-h-[60dvh] max-w-6xl px-4">{children}</div>
      <Footer />
    </>
  );
}
