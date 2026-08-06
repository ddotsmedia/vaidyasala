"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@vaidyasala/ui";

/** Submit button that reflects the form's pending state (§4 Tier 3 editor). */
export function ArticleSaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="brand" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}
