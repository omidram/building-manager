"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ManagerReviewActions({
  chargeId,
  receiptId,
  amount,
  ocrAmount,
}: {
  chargeId: string;
  receiptId?: string;
  amount: number;
  ocrAmount?: number | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function review(status: "PAID" | "PARTIAL" | "REJECTED") {
    setLoading(true);
    await fetch(`/api/charges/${chargeId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        receiptId,
        paidAmount: status === "PAID" ? amount : ocrAmount ?? 0,
        managerNote: status === "PAID" ? "تأیید دستی مدیر" : status === "REJECTED" ? "رد رسید" : "کسری تأیید شد",
      }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button className="btn btn-primary text-xs" disabled={loading} onClick={() => review("PAID")}>
        تأیید پرداخت کامل
      </button>
      <button className="btn btn-secondary text-xs" disabled={loading} onClick={() => review("PARTIAL")}>
        ثبت کسری
      </button>
      <button className="btn btn-secondary text-xs" disabled={loading} onClick={() => review("REJECTED")}>
        رد رسید
      </button>
    </div>
  );
}
