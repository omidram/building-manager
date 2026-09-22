"use client";

import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "OPEN", label: "باز" },
  { value: "IN_PROGRESS", label: "در حال بررسی" },
  { value: "RESOLVED", label: "حل‌شده" },
  { value: "CLOSED", label: "بسته" },
];

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();

  async function onChange(value: string) {
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    router.refresh();
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      تغییر وضعیت:
      <select className="field w-auto" value={status} onChange={(e) => onChange(e.target.value)}>
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
