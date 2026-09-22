"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-elevated px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-sky"
      aria-label={dark ? "حالت روشن" : "حالت تاریک"}
      title={dark ? "تم روشن" : "تم تاریک"}
    >
      {dark ? <Sun size={14} /> : <Moon size={14} />}
      {dark ? "روشن" : "تاریک"}
    </button>
  );
}
