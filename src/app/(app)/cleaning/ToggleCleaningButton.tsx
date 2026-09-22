"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ToggleCleaningButton({ id, completed }: { id: string; completed: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/cleaning/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button className="btn btn-secondary text-sm" onClick={toggle} disabled={loading}>
      {completed ? "بازگردانی به باقی‌مانده" : "علامت انجام‌شده"}
    </button>
  );
}
