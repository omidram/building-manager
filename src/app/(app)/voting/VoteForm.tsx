"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function VoteForm({ pollId, options }: { pollId: string; options: { id: string; label: string }[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function vote(optionId: string) {
    setLoading(true);
    await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId, optionId }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.id} className="btn btn-secondary text-sm" disabled={loading} onClick={() => vote(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
