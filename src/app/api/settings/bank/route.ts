import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "ورود لازم است" }, { status: 401 });

  const settings =
    (await prisma.buildingSettings.findUnique({ where: { id: "default" } })) ??
    (await prisma.buildingSettings.create({ data: { id: "default" } }));

  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "MANAGER") {
    return NextResponse.json({ error: "فقط مدیریت" }, { status: 403 });
  }

  const body = await req.json();
  const settings = await prisma.buildingSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      bankName: String(body.bankName || "").trim() || null,
      accountHolder: String(body.accountHolder || "").trim() || null,
      bankCardNumber: String(body.bankCardNumber || "").replace(/\D/g, "") || null,
      bankAccountNumber: String(body.bankAccountNumber || "").replace(/\D/g, "") || null,
      shebaNumber: String(body.shebaNumber || "").trim() || null,
      paymentNote: String(body.paymentNote || "").trim() || null,
    },
    update: {
      bankName: String(body.bankName || "").trim() || null,
      accountHolder: String(body.accountHolder || "").trim() || null,
      bankCardNumber: String(body.bankCardNumber || "").replace(/\D/g, "") || null,
      bankAccountNumber: String(body.bankAccountNumber || "").replace(/\D/g, "") || null,
      shebaNumber: String(body.shebaNumber || "").trim() || null,
      paymentNote: String(body.paymentNote || "").trim() || null,
    },
  });

  return NextResponse.json(settings);
}
