"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatToman } from "@/lib/format";

export function IssueChargesForm({ suggestedAmount, defaultMonth }: { suggestedAmount: number; defaultMonth: string }) {
  const router = useRouter();
  const [month, setMonth] = useState(defaultMonth);
  const [amount, setAmount] = useState(String(suggestedAmount || 2_500_000));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/charges/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, amount: Number(amount) }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "خطا");
      return;
    }
    setMsg(`شارژ برای ${data.count} واحد صادر و اعلان همگانی ارسال شد.`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="surface space-y-3 p-5">
      <h3 className="font-semibold text-teal-deep">صدور شارژ ماهانه (اعلام به همه)</h3>
      <p className="text-xs leading-6 text-muted">
        با صدور شارژ، برای هر ساکن صورتحساب ساخته می‌شود، ریز هزینه‌های همان ماه ضمیمه می‌شود و اعلان همگانی ارسال می‌گردد.
        {suggestedAmount > 0 && (
          <>
            {" "}
            پیشنهاد بر اساس هزینه‌های ثبت‌شده: <strong>{formatToman(suggestedAmount)}</strong>
          </>
        )}
      </p>
      <input className="field" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="ماه مثلاً ۱۴۰۴/۰۷" required />
      <input className="field" dir="ltr" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="مبلغ هر واحد (تومان)" required />
      {msg && <p className="text-sm text-teal">{msg}</p>}
      <button className="btn btn-coral" disabled={loading}>
        {loading ? "..." : "صدور شارژ و اعلان"}
      </button>
    </form>
  );
}
