import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { ocrReceiptImage } from "@/lib/ocr-server";
import {
  matchPayment,
  normalizePaidAmount,
  toLatinDigits,
  verifyDestination,
} from "@/lib/ocr";
import { notifyManagers, notifyUser } from "@/lib/notify";
import { formatToman } from "@/lib/format";
import { creditWallet } from "@/lib/wallet";

export const runtime = "nodejs";

function parseAmount(value: FormDataEntryValue | null): number | null {
  if (value == null) return null;
  const n = Number(toLatinDigits(String(value)).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "ورود لازم است" }, { status: 401 });

  const { id } = await ctx.params;
  const charge = await prisma.charge.findUnique({
    where: { id },
    include: { user: { select: { name: true, unit: true } } },
  });
  if (!charge) return NextResponse.json({ error: "شارژ یافت نشد" }, { status: 404 });
  if (user.role !== "MANAGER" && charge.userId !== user.id) {
    return NextResponse.json({ error: "دسترسی ندارید" }, { status: 403 });
  }
  if (charge.status === "PAID") {
    return NextResponse.json({ error: "این شارژ قبلاً پرداخت شده است" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("receipt");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "فایل رسید الزامی است" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "فقط تصویر رسید پذیرفته می‌شود" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "حجم فایل حداکثر ۸ مگابایت" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const fileName = `${charge.id}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "receipts");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), bytes);
  const imagePath = `/uploads/receipts/${fileName}`;

  let paidAmount = parseAmount(form.get("manualAmount"));
  let ocrText = String(form.get("ocrText") || "");
  const skipServerOcr = String(form.get("skipServerOcr") || "") === "1";

  if ((!ocrText || ocrText === "CLIENT_AMOUNT" || paidAmount == null) && !skipServerOcr) {
    try {
      const ocr = await ocrReceiptImage(bytes, 8000);
      if (!ocrText || ocrText.length < 10) ocrText = ocr.text;
      if (paidAmount == null) paidAmount = ocr.amount;
    } catch (err) {
      console.error("OCR failed", err);
      if (!ocrText) ocrText = "OCR_FAILED";
    }
  } else if (!ocrText) {
    ocrText = paidAmount != null ? "CLIENT_AMOUNT" : "NO_OCR";
  }

  if (paidAmount == null) {
    return NextResponse.json(
      { error: "مبلغ پرداخت‌شده مشخص نیست. مبلغ را وارد کنید و دوباره بفرستید." },
      { status: 400 },
    );
  }

  const settings = await prisma.buildingSettings.findUnique({ where: { id: "default" } });
  const dest = verifyDestination(ocrText, {
    bankCardNumber: settings?.bankCardNumber,
    bankAccountNumber: settings?.bankAccountNumber,
    shebaNumber: settings?.shebaNumber,
  });

  // Destination must match manager account; otherwise block auto-approval
  if (dest.ok === false) {
    const receipt = await prisma.paymentReceipt.create({
      data: {
        chargeId: charge.id,
        imagePath,
        ocrText,
        ocrAmount: normalizePaidAmount(charge.amount, paidAmount),
        matchStatus: "WRONG_DESTINATION",
        shortfall: 0,
        surplus: 0,
        destinationOk: false,
        destinationInfo: dest.info,
      },
    });

    const updated = await prisma.charge.update({
      where: { id: charge.id },
      data: {
        status: "UNDER_REVIEW",
        paidAmount: 0,
        note: `مقصد نامعتبر: ${dest.info}`,
      },
    });

    await notifyManagers(
      "واریز به حساب اشتباه؟",
      `${charge.user.name} رسید آپلود کرد اما مقصد با حساب مدیریت یکی نیست. ${dest.info}`,
      "/charges",
    );
    await notifyUser(
      charge.userId,
      "مقصد واریز تأیید نشد",
      "شماره مقصد در رسید با حساب مدیریت ساختمان مطابقت ندارد. لطفاً به کارت/حساب اعلام‌شده واریز و رسید صحیح آپلود کنید.",
      "/charges",
    );

    return NextResponse.json({
      receipt,
      charge: updated,
      ocrAmount: paidAmount,
      match: {
        matchStatus: "WRONG_DESTINATION",
        shortfall: 0,
        surplus: 0,
        chargeStatus: "UNDER_REVIEW",
      },
      destination: dest,
    });
  }

  if (dest.ok === null) {
    const receipt = await prisma.paymentReceipt.create({
      data: {
        chargeId: charge.id,
        imagePath,
        ocrText,
        ocrAmount: normalizePaidAmount(charge.amount, paidAmount),
        matchStatus: "UNREADABLE",
        shortfall: 0,
        surplus: 0,
        destinationOk: null,
        destinationInfo: dest.info,
      },
    });

    const updated = await prisma.charge.update({
      where: { id: charge.id },
      data: {
        status: "UNDER_REVIEW",
        paidAmount: normalizePaidAmount(charge.amount, paidAmount),
        note: "مقصد واریز از روی رسید تأیید نشد — بررسی مدیر لازم است",
      },
    });

    await notifyManagers(
      "بررسی مقصد واریز لازم است",
      `${charge.user.name} رسید شارژ ${charge.month} آپلود کرد ولی شماره مقصد خوانده/تأیید نشد.`,
      "/charges",
    );

    return NextResponse.json({
      receipt,
      charge: updated,
      ocrAmount: normalizePaidAmount(charge.amount, paidAmount),
      match: {
        matchStatus: "UNREADABLE",
        shortfall: 0,
        surplus: 0,
        chargeStatus: "UNDER_REVIEW",
      },
      destination: dest,
    });
  }

  // Destination OK — match amount
  const match = matchPayment(charge.amount, paidAmount);
  const normalizedPaid = normalizePaidAmount(charge.amount, paidAmount);
  const remainingDue = Math.max(0, charge.amount - Math.min(normalizedPaid, charge.amount));

  const receipt = await prisma.paymentReceipt.create({
    data: {
      chargeId: charge.id,
      imagePath,
      ocrText,
      ocrAmount: normalizedPaid,
      matchStatus: match.matchStatus,
      shortfall: match.shortfall,
      surplus: match.surplus,
      destinationOk: true,
      destinationInfo: dest.info,
    },
  });

  const appliedToCharge = Math.min(normalizedPaid, charge.amount);
  const updated = await prisma.charge.update({
    where: { id: charge.id },
    data: {
      status: match.chargeStatus,
      paidAmount: appliedToCharge,
      paidAt: match.chargeStatus === "PAID" ? new Date() : null,
      note:
        match.matchStatus === "SHORTFALL"
          ? `کسری: ${formatToman(match.shortfall)}`
          : match.matchStatus === "OVERPAY"
            ? `مازاد ${formatToman(match.surplus)} به کیف پول واریز شد`
            : charge.note,
    },
  });

  let walletBalance: number | null = null;
  if (match.matchStatus === "OVERPAY" && match.surplus > 0) {
    await creditWallet({
      userId: charge.userId,
      amount: match.surplus,
      type: "OVERPAY_CREDIT",
      note: `مازاد پرداخت شارژ ${charge.month}`,
      chargeId: charge.id,
    });
    const u = await prisma.user.findUnique({
      where: { id: charge.userId },
      select: { walletBalance: true },
    });
    walletBalance = u?.walletBalance ?? null;
  }

  const unitLabel = charge.user.unit || charge.user.name;
  if (match.matchStatus === "MATCH") {
    await notifyManagers(
      "پرداخت کامل شارژ",
      `${charge.user.name} (${unitLabel}) شارژ ${charge.month} را کامل پرداخت کرد. ${dest.info}`,
      "/charges",
    );
    await notifyUser(charge.userId, "پرداخت تأیید شد", `شارژ ${charge.month} کامل شد.`, "/charges");
  } else if (match.matchStatus === "OVERPAY") {
    await notifyManagers(
      "پرداخت با مازاد",
      `${charge.user.name} (${unitLabel}) ${formatToman(normalizedPaid)} واریز کرد؛ مازاد ${formatToman(match.surplus)} به کیف پولش رفت.`,
      "/charges",
    );
    await notifyUser(
      charge.userId,
      "پرداخت کامل + اعتبار کیف پول",
      `شارژ ${charge.month} تسویه شد و مازاد ${formatToman(match.surplus)} به کیف پول شما اضافه شد.`,
      "/charges",
    );
  } else if (match.matchStatus === "SHORTFALL") {
    await notifyManagers(
      "کسری در پرداخت شارژ",
      `${charge.user.name} (${unitLabel}) ${formatToman(normalizedPaid)} واریز کرده؛ کسری ${formatToman(match.shortfall)}.`,
      "/charges",
    );
    await notifyUser(
      charge.userId,
      "کسری پرداخت",
      `مانده قابل پرداخت: ${formatToman(remainingDue)}.`,
      "/charges",
    );
  }

  return NextResponse.json({
    receipt,
    charge: updated,
    ocrAmount: normalizedPaid,
    match,
    destination: dest,
    walletBalance,
  });
}
