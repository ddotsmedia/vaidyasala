import "server-only";

/**
 * Verify a Cloudflare Turnstile token (§13 comments spam gate). When
 * TURNSTILE_SECRET is unset (dev/fixture) verification is skipped (returns true)
 * so the flow is testable offline; in production the secret makes it enforcing.
 */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true; // BLOCKED: no TURNSTILE_SECRET — spam gate disabled in dev.
  if (!token) return false;
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip) form.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
