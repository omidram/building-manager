"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function CreateTicketForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: fd.get("title"), body: fd.get("body") }),
      });
      if (res.ok) {
        const ticket = await res.json();
        form.reset();
        router.push(`/tickets/${ticket.id}`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="surface space-y-3 p-5">
      <h3 className="font-semibold text-teal-deep">تیکت جدید</h3>
      <input name="title" className="field" placeholder="موضوع" required />
      <textarea name="body" className="field min-h-28" placeholder="شرح درخواست یا پیام" required />
      <button className="btn btn-primary" disabled={loading}>
        {loading ? "..." : "ارسال تیکت"}
      </button>
    </form>
  );
}
