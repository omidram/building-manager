"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function CreateAnnouncementForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [important, setImportant] = useState(true);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, important }),
    });
    setTitle("");
    setBody("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="surface space-y-3 p-5">
      <h3 className="font-semibold text-teal-deep">ارسال اعلان جدید</h3>
      <input className="field" placeholder="عنوان" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <textarea
        className="field min-h-28"
        placeholder="متن اعلان"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
      />
      <label className="flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />
        اعلان مهم
      </label>
      <button className="btn btn-primary" disabled={loading}>
        {loading ? "در حال ارسال..." : "انتشار اعلان"}
      </button>
    </form>
  );
}
