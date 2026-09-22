"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function CreateExpenseForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        amount: Number(fd.get("amount")),
        category: fd.get("category"),
        month: fd.get("month"),
        description: fd.get("description"),
      }),
    });
    setLoading(false);
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="surface grid gap-3 p-5 md:grid-cols-2">
      <h3 className="font-semibold text-teal-deep md:col-span-2">ثبت هزینه جدید</h3>
      <input name="title" className="field" placeholder="عنوان" required />
      <input name="amount" className="field" type="number" placeholder="مبلغ (تومان)" required />
      <input name="category" className="field" placeholder="دسته" required />
      <input name="month" className="field" placeholder="ماه مثلاً ۱۴۰۴/۰۶" required />
      <input name="description" className="field md:col-span-2" placeholder="توضیح (اختیاری)" />
      <button className="btn btn-primary md:col-span-2" disabled={loading}>
        {loading ? "..." : "ثبت"}
      </button>
    </form>
  );
}
