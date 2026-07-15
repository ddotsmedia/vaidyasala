"use client";

import * as React from "react";
import { Contrast, Moon, Sun } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@vaidyasala/ui";

type Theme = "dark" | "light" | "hc";

const THEMES: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: "dark", label: "Dark", icon: <Moon className="size-4" /> },
  { value: "light", label: "Light", icon: <Sun className="size-4" /> },
  { value: "hc", label: "High contrast", icon: <Contrast className="size-4" /> },
];

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("vaidyasala-theme", theme);
  } catch {
    /* storage unavailable — theme still applies for this session */
  }
}

export function ThemeSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          <Sun className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEMES.map((t) => (
          <DropdownMenuItem key={t.value} onSelect={() => apply(t.value)}>
            {t.icon}
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Inline script: applies the saved theme before paint to avoid a flash. */
export function ThemeScript() {
  const js = `(function(){try{var t=localStorage.getItem('vaidyasala-theme');if(t&&t!=='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
