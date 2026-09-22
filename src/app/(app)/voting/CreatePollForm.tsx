"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function CreatePollForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState("موافقم\nمخالفم");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        options: options
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      }),
    });
    setTitle("");
    setDescription("");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="surface space-y-3 p-5">
      <h3 className="font-semibold text-teal-deep">ایجاد رأی‌گیری جدید</h3>
      <input className="field" placeholder="عنوان" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <textarea className="field min-h-20" placeholder="توضیح" value={description} onChange={(e) => setDescription(e.target.value)} required />
      <textarea
        className="field min-h-24"
        placeholder="گزینه‌ها (هر خط یک گزینه)"
        value={options}
        onChange={(e) => setOptions(e.target.value)}
        required
      />
      <button className="btn btn-primary" disabled={loading}>
        {loading ? "..." : "ایجاد"}
      </button>
    </form>
  );
}
