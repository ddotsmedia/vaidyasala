"use client";
import * as React from "react";
import { Button } from "@vaidyasala/ui";
import { deletePlaylist } from "@/app/(admin)/admin/playlists/actions";

export function DeletePlaylistButton({ id }: { id: string }) {
  const [pending, start] = React.useTransition();
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => void deletePlaylist(id))}>
      Delete
    </Button>
  );
}
