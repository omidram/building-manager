"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatToman } from "@/lib/format";
import Image from "next/image";
import { ocrReceiptInBrowser } from "@/lib/ocr-client";
import { verifyDestination } from "@/lib/ocr";

type BreakdownItem = { title: string; amount: number; category: string; share: number };

type BankInfo = {
  bankCardNumber?: string | null;
  bankAccountNumber?: string | null;
  shebaNumber?: string | null;
};

export function ReceiptUploadForm({
  chargeId,
  amount,
  remaining,
  bank,
}: {
  chargeId: string;
  amount: number;
  remaining: number;
  bank: BankInfo;
}) {
  const router = useRouter();
  const due = remaining > 0 && remaining < amount ? remaining : amount;
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState(String(due));
  const [ocrText, setOcrText] = useState("");
  const [destHint, setDestHint] = useState<{ ok: boolean | null; info: string } | null>(null);
  const [ocrHint, setOcrHint] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"ok" | "warn" | "bad">("ok");
  const [error, setError] = useState<string | null>(null);
  const ocrGen = useRef(0);

  useEffect(() => {
    setPaidAmount(String(due));
  }, [due]);

  const paidNum = Number(String(paidAmount).replace(/[^\d]/g, "")) || 0;
  const delta = paidNum - due;

  async function onFileChange(file: File | null) {
    const gen = ++ocrGen.current;
    setMessage(null);
    setError(null);
    setOcrHint(null);
    setDestHint(null);
    setOcrText("");

    if (!file) {
      setPreview(null);
      return;
    }

    setPreview(URL.createObjectURL(file));
    setOcrBusy(true);
    setOcrProgress(0);

    try {
      const result = await ocrReceiptInBrowser(file, {
        expectedAmount: due,
        timeoutMs: 12_000,
        onProgress: (p) => {
          if (ocrGen.current === gen) setOcrProgress(p);
        },
      });
      if (ocrGen.current !== gen) return;

      setOcrText(result.text || "");
      const dest = verifyDestination(result.text || "", bank);
      setDestHint(dest);

      if (result.amount) {
        setPaidAmount(String(result.amount));
        setOcrHint(`مبلغ از رسید خوانده شد (${result.ms}ms).`);
      } else {
        setOcrHint("مبلغ خودکار خوانده نشد — دستی وارد کنید.");
      }
    } catch {
      if (ocrGen.current === gen) {
        setOcrHint("خواندن خودکار ناموفق بود. مبلغ را دستی وارد کنید.");
      }
    } finally {
      if (ocrGen.current === gen) {
        setOcrBusy(false);
        setOcrProgress(100);
      }
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("تصویر رسید را انتخاب کنید");
      return;
    }

    const paid = Number(String(paidAmount).replace(/[^\d]/g, ""));
    if (!Number.isFinite(paid) || paid <= 0) {
      setError("مبلغ پرداخت‌شده را وارد کنید");
      return;
    }

    const fd = new FormData();
    fd.set("receipt", file);
    fd.set("manualAmount", String(paid));
    fd.set("ocrText", ocrText);
    fd.set("skipServerOcr", ocrText ? "1" : "0");

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/charges/${chargeId}/receipt`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "آپلود ناموفق بود");
        return;
      }

      const status = data.match?.matchStatus;
      if (status === "MATCH") {
        setMessageTone("ok");
        setMessage(`پرداخت کامل تأیید شد. مقصد و مبلغ مطابق است.`);
      } else if (status === "OVERPAY") {
        setMessageTone("ok");
        setMessage(
          `شارژ تسویه شد. مازاد ${formatToman(data.match.surplus)} به کیف پول شما اضافه شد` +
            (data.walletBalance != null ? ` (موجودی: ${formatToman(data.walletBalance)})` : ".") ,
        );
      } else if (status === "SHORTFALL") {
        setMessageTone("bad");
        setMessage(`کسری پرداخت: ${formatToman(data.match.shortfall)}. مدیریت مطلع شد.`);
      } else if (status === "WRONG_DESTINATION") {
        setMessageTone("bad");
        setMessage(data.destination?.info || "مقصد واریز با حساب مدیریت یکی نیست.");
      } else {
        setMessageTone("warn");
        setMessage(data.destination?.info || "رسید ثبت شد و منتظر بررسی مدیریت است.");
      }

      form.reset();
      setPreview(null);
      setOcrHint(null);
      setDestHint(null);
      setOcrText("");
      setPaidAmount(String(due));
      router.refresh();
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-2xl border border-dashed border-teal/40 bg-sky/40 p-4">
      <p className="text-sm font-medium text-teal-deep">آپلود رسید کارت‌به‌کارت</p>
      <p className="text-xs leading-6 text-muted">
        مبلغ قابل پرداخت: <strong>{formatToman(due)}</strong>. واریز فقط به حساب مدیریت معتبر است؛ مقصد از روی رسید بررسی می‌شود.
        مازاد به کیف پول شما می‌رود.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        required
        className="field"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />

      {preview && (
        <div className="relative h-40 w-full overflow-hidden rounded-xl border border-line bg-white">
          <Image src={preview} alt="پیش‌نمایش رسید" fill className="object-contain" unoptimized />
        </div>
      )}

      {ocrBusy && (
        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full bg-teal transition-all" style={{ width: `${ocrProgress}%` }} />
          </div>
          <p className="text-xs text-muted">خواندن مبلغ و مقصد… {ocrProgress}٪</p>
        </div>
      )}

      {ocrHint && !ocrBusy && <p className="text-xs text-muted">{ocrHint}</p>}

      {destHint && !ocrBusy && (
        <p
          className={`rounded-xl px-3 py-2 text-xs leading-6 ${
            destHint.ok === true
              ? "bg-teal-soft text-teal-deep"
              : destHint.ok === false
                ? "bg-coral-soft text-coral"
                : "bg-gold-soft text-ink"
          }`}
        >
          {destHint.ok === true ? "مقصد: تأیید شد — " : destHint.ok === false ? "مقصد: نامعتبر — " : "مقصد: نامشخص — "}
          {destHint.info}
        </p>
      )}

      <div>
        <label className="label" htmlFor={`paid-${chargeId}`}>
          مبلغ پرداخت‌شده (تومان) — الزامی
        </label>
        <input
          id={`paid-${chargeId}`}
          className="field font-semibold"
          inputMode="numeric"
          dir="ltr"
          value={paidAmount}
          onChange={(e) => setPaidAmount(e.target.value)}
          required
          placeholder={String(due)}
        />
        {paidNum > 0 && (
          <p
            className={`mt-2 text-sm font-semibold ${
              delta === 0 ? "text-teal" : delta > 0 ? "text-teal" : "text-coral"
            }`}
          >
            {delta === 0 && "سر به سر با مبلغ شارژ"}
            {delta > 0 && `مازاد: ${formatToman(delta)} → کیف پول`}
            {delta < 0 && `کسری: ${formatToman(Math.abs(delta))}`}
          </p>
        )}
        <button type="button" className="mt-1 text-xs text-teal" onClick={() => setPaidAmount(String(due))}>
          پر کردن با مبلغ شارژ ({formatToman(due)})
        </button>
      </div>

      {message && (
        <p
          className={`text-sm ${
            messageTone === "ok" ? "text-teal" : messageTone === "bad" ? "text-coral" : "text-gold"
          }`}
        >
          {message}
        </p>
      )}
      {error && <p className="text-sm text-coral">{error}</p>}

      <button className="btn btn-primary text-sm" disabled={loading}>
        {loading ? "در حال ثبت..." : "ثبت رسید و تطبیق"}
      </button>
    </form>
  );
}

export function BreakdownList({ json }: { json: string | null }) {
  if (!json) return null;
  let items: BreakdownItem[] = [];
  try {
    items = JSON.parse(json);
  } catch {
    return null;
  }
  if (!items.length) return null;
  return (
    <ul className="mt-3 space-y-1.5 rounded-xl bg-white/70 p-3 text-xs text-muted">
      <li className="mb-1 font-semibold text-ink">ریز هزینه‌های مشاعات (سهم واحد):</li>
      {items.map((item) => (
        <li key={item.title} className="flex justify-between gap-3">
          <span>
            {item.title} <span className="text-[10px]">({item.category})</span>
          </span>
          <span className="shrink-0 font-medium text-teal-deep">{formatToman(item.share)}</span>
        </li>
      ))}
    </ul>
  );
}
