import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";
import { formatToman } from "@/lib/format";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "MANAGER") {
    return NextResponse.json({ error: "فقط مدیریت" }, { status: 403 });
  }

  const body = await req.json();
  const month = String(body.month || "").trim();
  const amount = Number(body.amount);
  if (!month || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "ماه و مبلغ معتبر لازم است" }, { status: 400 });
  }

  const expenses = await prisma.expense.findMany({ where: { month }, orderBy: { createdAt: "asc" } });
  const residents = await prisma.user.findMany({ where: { role: "RESIDENT" } });
  if (!residents.length) {
    return NextResponse.json({ error: "ساکنی ثبت نشده" }, { status: 400 });
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const breakdownJson = JSON.stringify(
    expenses.map((e) => ({
      title: e.title,
      amount: e.amount,
      category: e.category,
      share: Math.round(e.amount / residents.length),
    })),
  );

  // Avoid duplicate charges for same month+user
  const existing = await prisma.charge.findMany({
    where: { month, userId: { in: residents.map((r) => r.id) } },
    select: { userId: true },
  });
  const existingSet = new Set(existing.map((e) => e.userId));
  const targets = residents.filter((r) => !existingSet.has(r.id));

  if (!targets.length) {
    return NextResponse.json({ error: "برای این ماه قبلاً شارژ صادر شده است" }, { status: 400 });
  }

  await prisma.charge.createMany({
    data: targets.map((r) => ({
      userId: r.id,
      month,
      amount,
      status: "PENDING" as const,
      breakdownJson,
      note: totalExpenses
        ? `سهم واحد از جمع هزینه‌های مشاعات (${formatToman(totalExpenses)})`
        : "شارژ ماهانه ساختمان",
    })),
  });

  const expenseLines =
    expenses.length > 0
      ? expenses.map((e) => `• ${e.title}: ${formatToman(e.amount)}`).join("\n")
      : "ریز هزینه برای این ماه ثبت نشده است.";

  await prisma.announcement.create({
    data: {
      title: `اعلان شارژ ماه ${month}`,
      body: `شارژ ماهانه هر واحد: ${formatToman(amount)}\n\nریز هزینه‌های مشاعات:\n${expenseLines}\n\nلطفاً مبلغ را به شماره کارت اعلام‌شده در بخش شارژ واریز کنید و عکس رسید بانکی را آپلود نمایید.`,
      important: true,
      authorId: user.id,
    },
  });

  await Promise.all(
    targets.map((r) =>
      notifyUser(
        r.id,
        `شارژ ${month} اعلام شد`,
        `مبلغ قابل پرداخت: ${formatToman(amount)}. جزئیات و شماره کارت در پنل شارژ ماهانه.`,
        "/charges",
      ),
    ),
  );

  return NextResponse.json({ ok: true, count: targets.length, amount, month, totalExpenses });
}
