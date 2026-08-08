import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  name: string;
  path: string;
  /** Malayalam labels need the font + lang attribute. */
  lang?: "ml";
}

/**
 * Visible breadcrumb trail (§1.3). Pairs with `breadcrumbLd` — that emits the
 * JSON-LD for search engines, this is the one people can actually click.
 *
 * The last crumb is the current page, so it renders as plain text with
 * aria-current rather than a link back to itself.
 */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="text-text-dim flex flex-wrap items-center gap-1 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.path} className="flex min-w-0 items-center gap-1">
              {last ? (
                <span
                  aria-current="page"
                  className={`truncate ${c.lang === "ml" ? "font-ml leading-[1.7]" : ""}`}
                  lang={c.lang}
                >
                  {c.name}
                </span>
              ) : (
                <>
                  <Link
                    href={c.path as Route}
                    className={`hover:text-text hover:underline ${
                      c.lang === "ml" ? "font-ml leading-[1.7]" : ""
                    }`}
                    lang={c.lang}
                  >
                    {c.name}
                  </Link>
                  <ChevronRight className="size-3.5 shrink-0" aria-hidden />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
