import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";
import { formatToman } from "@/lib/format";
import { creditWallet } from "@/lib/wallet";
import type { ChargeStatus } from "@prisma/client";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "MANAGER") {
    return NextResponse.json({ error: "فقط مدیریت" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const status = body.status as ChargeStatus;
  const paidAmount = body.paidAmount != null ? Number(body.paidAmount) : undefined;

  const charge = await prisma.charge.findUnique({ where: { id } });
  if (!charge) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });

  const effectivePaid = paidAmount ?? charge.paidAmount;
  const applied = Math.min(effectivePaid, charge.amount);
  const surplus = Math.max(0, effectivePaid - charge.amount);
  const shortfall = Math.max(0, charge.amount - effectivePaid);

  const updated = await prisma.charge.update({
    where: { id },
    data: {
      status,
      paidAmount: status === "PAID" ? charge.amount : applied,
      paidAt: status === "PAID" ? new Date() : charge.paidAt,
      note:
        body.note != null
          ? String(body.note)
          : status === "PAID" && surplus > 0
            ? `تأیید مدیر — مازاد ${formatToman(surplus)} به کیف پول`
            : status === "PARTIAL"
              ? `کسری: ${formatToman(shortfall)}`
              : charge.note,
    },
  });

  if (body.receiptId) {
    await prisma.paymentReceipt.update({
      where: { id: String(body.receiptId) },
      data: {
        reviewed: true,
        managerNote: body.managerNote ? String(body.managerNote) : null,
        destinationOk: status === "PAID" || status === "PARTIAL" ? true : undefined,
        ocrAmount: effectivePaid,
        matchStatus:
          status === "PAID" ? (surplus > 0 ? "OVERPAY" : "MATCH") : status === "PARTIAL" ? "SHORTFALL" : undefined,
        shortfall: status === "PARTIAL" ? shortfall : 0,
        surplus: status === "PAID" ? surplus : 0,
      },
    });
  }

  if (status === "PAID" && surplus > 0) {
    await creditWallet({
      userId: charge.userId,
      amount: surplus,
      type: "OVERPAY_CREDIT",
      note: `مازاد تأییدشده توسط مدیر — شارژ ${charge.month}`,
      chargeId: charge.id,
    });
  }

  await notifyUser(
    charge.userId,
    "بررسی رسید توسط مدیریت",
    status === "PAID"
      ? surplus > 0
        ? `پرداخت تأیید شد و مازاد ${formatToman(surplus)} به کیف پول اضافه شد.`
        : `پرداخت شارژ ${charge.month} تأیید شد.`
      : status === "PARTIAL"
        ? `پرداخت ناقص. کسری: ${formatToman(shortfall)}`
        : `وضعیت شارژ ${charge.month} به «${status}» تغییر کرد.`,
    "/charges",
  );

  return NextResponse.json(updated);
}
