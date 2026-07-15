"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

/** App-wide toast host. Mount once in the root layout. Styled to tokens. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!bg-surface-2 !text-text !border !border-border !rounded-md",
          description: "!text-text-dim",
        },
      }}
    />
  );
}

export { toast };
