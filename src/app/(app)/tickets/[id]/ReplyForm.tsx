"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ReplyForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/tickets/${ticketId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setBody("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="surface space-y-3 p-5">
      <textarea className="field min-h-24" placeholder="پاسخ خود را بنویسید..." value={body} onChange={(e) => setBody(e.target.value)} required />
      <button className="btn btn-primary" disabled={loading}>
        {loading ? "..." : "ارسال پاسخ"}
      </button>
    </form>
  );
}
