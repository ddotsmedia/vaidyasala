"use client";

import * as React from "react";
import { Copy, Facebook, MessageCircle, Twitter } from "lucide-react";
import { Button } from "../primitives/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../primitives/dialog";

export interface ShareSheetProps {
  url: string;
  title: string;
  /** UTM source appended to every outbound share link. */
  utmSource?: string;
  children?: React.ReactNode;
}

function withUtm(url: string, medium: string, source: string): string {
  const u = new URL(url);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", medium);
  return u.toString();
}

/** WhatsApp-first share (Kerala reality, §4). All links carry UTM. */
export function ShareSheet({ url, title, utmSource = "share", children }: ShareSheetProps) {
  const wa = `https://wa.me/?text=${encodeURIComponent(`${title} ${withUtm(url, "whatsapp", utmSource)}`)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(withUtm(url, "facebook", utmSource))}`;
  const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(withUtm(url, "twitter", utmSource))}`;

  return (
    <Dialog>
      <DialogTrigger asChild>{children ?? <Button variant="outline">Share</Button>}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button asChild variant="brand">
            <a href={wa} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={fb} target="_blank" rel="noopener noreferrer">
              <Facebook className="size-4" /> Facebook
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={tw} target="_blank" rel="noopener noreferrer">
              <Twitter className="size-4" /> X
            </a>
          </Button>
          <Button
            variant="ghost"
            onClick={() => void navigator.clipboard?.writeText(withUtm(url, "copy", utmSource))}
          >
            <Copy className="size-4" /> Copy link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
