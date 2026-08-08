import "server-only";

/**
 * Make `generateStaticParams` tolerate an unreachable database.
 *
 * Prerendering wants a DB, but the image is built on a CI runner and inside
 * `docker build`, where there is none — and failing the whole build because a
 * database is missing at *compile* time is the wrong trade. Every route using
 * this sets `dynamicParams = true`, so an empty list simply means pages are
 * rendered on first request and then cached by ISR, exactly as they would be
 * for a slug published after the build.
 *
 * Only build-time prerendering is affected. A DB outage at runtime still
 * surfaces as an error, which is what you want there.
 */
export async function safeStaticParams<T>(
  load: () => Promise<T[]>,
  label: string,
): Promise<T[]> {
  try {
    return await load();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(
      `[static-params] ${label}: no database at build time — falling back to ` +
        `on-demand rendering (${reason.split("\n")[0]})`,
    );
    return [];
  }
}
