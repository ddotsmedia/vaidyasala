"use client";
import { useRouter } from "next/navigation";
import { Button } from "@vaidyasala/ui";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
