"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@vaidyasala/ui";
import { signIn } from "@/lib/auth-client";

/** Admin login (§2D). Email + password → Better Auth session → /admin. */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await signIn.email({ email, password });
    setPending(false);
    if (res.error) {
      setError(res.error.message ?? "Sign-in failed");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Vaidyasala Admin</h1>
        <p className="text-text-dim text-sm">Sign in to manage content.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
