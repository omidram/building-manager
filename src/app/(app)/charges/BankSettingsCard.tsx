"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCardNumber } from "@/lib/format";

type Settings = {
  bankName: string | null;
  accountHolder: string | null;
  bankCardNumber: string | null;
  bankAccountNumber: string | null;
  shebaNumber: string | null;
  paymentNote: string | null;
};

export function BankSettingsCard({ initial, canEdit }: { initial: Settings; canEdit: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings/bank", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setMsg(res.ok ? "ذخیره شد" : "خطا در ذخیره");
    router.refresh();
  }

  if (!canEdit) {
    return (
      <div className="surface p-5">
        <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-teal-deep">اطلاعات واریز</h3>
        <p className="mt-1 text-sm text-muted">کارت‌به‌کارت به مشخصات زیر، سپس آپلود رسید در همان شارژ.</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">بانک</dt>
            <dd className="font-medium">{form.bankName || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">به نام</dt>
            <dd className="font-medium">{form.accountHolder || "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">شماره کارت</dt>
            <dd className="font-mono font-semibold tracking-wide" dir="ltr">
              {formatCardNumber(form.bankCardNumber)}
            </dd>
          </div>
          {form.bankAccountNumber && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">شماره حساب</dt>
              <dd className="font-mono" dir="ltr">
                {form.bankAccountNumber}
              </dd>
            </div>
          )}
          {form.shebaNumber && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">شبا</dt>
              <dd className="font-mono text-xs" dir="ltr">
                {form.shebaNumber}
              </dd>
            </div>
          )}
        </dl>
        {form.paymentNote && <p className="mt-4 rounded-xl bg-gold-soft/60 p-3 text-xs leading-6 text-ink">{form.paymentNote}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={onSave} className="surface space-y-3 p-5">
      <h3 className="font-semibold text-teal-deep">تنظیم حساب دریافت شارژ</h3>
      <input className="field" placeholder="نام بانک" value={form.bankName ?? ""} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
      <input
        className="field"
        placeholder="نام صاحب حساب"
        value={form.accountHolder ?? ""}
        onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
      />
      <input
        className="field"
        placeholder="شماره کارت ۱۶ رقمی"
        dir="ltr"
        value={form.bankCardNumber ?? ""}
        onChange={(e) => setForm({ ...form, bankCardNumber: e.target.value })}
      />
      <input
        className="field"
        placeholder="شماره حساب"
        dir="ltr"
        value={form.bankAccountNumber ?? ""}
        onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
      />
      <input
        className="field"
        placeholder="شبا"
        dir="ltr"
        value={form.shebaNumber ?? ""}
        onChange={(e) => setForm({ ...form, shebaNumber: e.target.value })}
      />
      <textarea
        className="field min-h-20"
        placeholder="توضیح برای ساکنان"
        value={form.paymentNote ?? ""}
        onChange={(e) => setForm({ ...form, paymentNote: e.target.value })}
      />
      {msg && <p className="text-sm text-teal">{msg}</p>}
      <button className="btn btn-primary" disabled={saving}>
        {saving ? "..." : "ذخیره اطلاعات بانکی"}
      </button>
    </form>
  );
}
