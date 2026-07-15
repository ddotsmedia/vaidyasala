import Link from "next/link";
import { Button } from "@vaidyasala/ui";

export default function HomePage() {
  return (
    <section className="flex flex-col items-start gap-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Trusted Malayalam health videos, made searchable.
      </h1>
      <p lang="ml" className="font-ml max-w-2xl text-base leading-[var(--leading-ml)] text-text-dim">
        മലയാളം ആരോഗ്യ വീഡിയോകൾ AI സഹായത്തോടെ കണ്ടെത്തൂ — തിരയൂ, കാണൂ, പഠിക്കൂ.
      </p>
      <div className="flex gap-3">
        <Button asChild variant="brand" size="lg">
          <Link href="/topics">Browse topics</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/latest">Latest videos</Link>
        </Button>
      </div>
      <p className="text-sm text-text-dim">
        Foundation scaffold — the full home experience arrives in Phase 3.
      </p>
    </section>
  );
}
