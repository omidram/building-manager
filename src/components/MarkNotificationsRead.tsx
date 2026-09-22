"use client";

import { useRouter } from "next/navigation";

export function MarkNotificationsRead() {
  const router = useRouter();
  return (
    <button
      className="text-xs text-teal"
      onClick={async () => {
        await fetch("/api/notifications", { method: "POST" });
        router.refresh();
      }}
    >
      خوانده‌شدن همه
    </button>
  );
}
