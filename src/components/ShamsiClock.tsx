"use client";

import { useEffect, useState } from "react";
import { formatLiveShamsi } from "@/lib/format";

export function ShamsiClock({ className = "" }: { className?: string }) {
  const [label, setLabel] = useState(() => formatLiveShamsi(new Date()));

  useEffect(() => {
    setLabel(formatLiveShamsi(new Date()));
    const id = setInterval(() => setLabel(formatLiveShamsi(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <time className={className} dateTime={new Date().toISOString()} suppressHydrationWarning>
      {label}
    </time>
  );
}
