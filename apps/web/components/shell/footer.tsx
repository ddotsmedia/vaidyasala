import Link from "next/link";

/** Footer (§1.4): topic index, playlists, newsletter, trust pages. */
const COLUMNS = [
  {
    heading: "Explore",
    links: [
      { href: "/topics", label: "Topics" },
      { href: "/latest", label: "Latest" },
      { href: "/trending", label: "Trending" },
      { href: "/playlists", label: "Playlists" },
    ],
  },
  {
    heading: "Stay in touch",
    links: [
      { href: "/newsletter", label: "Newsletter" },
      { href: "/subscribe", label: "Subscribe on YouTube" },
    ],
  },
  {
    heading: "Trust",
    links: [
      { href: "/about", label: "About" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-lg font-semibold text-text">Vaidyasala</p>
          <p lang="ml" className="font-ml mt-2 text-sm leading-[var(--leading-ml)] text-text-dim">
            വിശ്വസനീയമായ മലയാളം ആരോഗ്യ വീഡിയോകൾ.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.heading} className="flex flex-col gap-2">
            <p className="text-sm font-medium text-text">{col.heading}</p>
            {col.links.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm text-text-dim hover:text-text">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-text-dim">
        © {new Date().getFullYear()} Vaidyasala · Not a substitute for professional medical advice.
      </div>
    </footer>
  );
}
