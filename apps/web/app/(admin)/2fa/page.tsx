"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@vaidyasala/ui";
import { startTotpEnrollment, confirmTotp } from "./actions";

/**
 * TOTP enrollment (§10). EDITOR/ADMIN must enable 2FA before the admin panel
 * unlocks. Mint a secret (otpauth URI + backup codes) → verify a 6-digit code
 * from the authenticator app → enabled. Self-contained TOTP (lib/totp).
 */
export default function TwoFactorSetupPage() {
  const router = useRouter();
  const [uri, setUri] = React.useState<string | null>(null);
  const [backup, setBackup] = React.useState<string[]>([]);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    const res = await startTotpEnrollment();
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setUri(res.uri);
    setBackup(res.backupCodes);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await confirmTotp(code);
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Invalid code");
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Set up two-factor authentication</h1>
        <p className="text-text-dim mt-1 text-sm">
          Required for editor and admin access (§10). Use any authenticator app.
        </p>
      </div>

      {!uri ? (
        <Button variant="brand" disabled={busy} onClick={start}>
          {busy ? "Generating…" : "Generate secret"}
        </Button>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="border-border rounded-lg border p-3">
            <p className="text-text-dim text-xs">Add this to your authenticator app:</p>
            <code className="mt-1 block break-all text-xs">{uri}</code>
          </div>
          {backup.length > 0 ? (
            <div className="border-border rounded-lg border p-3">
              <p className="text-text-dim text-xs">Backup codes — store these safely:</p>
              <div className="mt-1 grid grid-cols-2 gap-1 font-mono text-xs">
                {backup.map((b) => (
                  <span key={b}>{b}</span>
                ))}
              </div>
            </div>
          ) : null}
          <form onSubmit={verify} className="flex flex-col gap-3">
            <Input
              inputMode="numeric"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Button type="submit" variant="brand" disabled={busy}>
              {busy ? "Verifying…" : "Verify & enable"}
            </Button>
          </form>
        </div>
      )}

      {error ? <p className="text-cta text-sm">{error}</p> : null}
    </main>
  );
}
