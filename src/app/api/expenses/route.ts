import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "MANAGER") {
    return NextResponse.json({ error: "فقط مدیریت" }, { status: 403 });
  }
  const body = await req.json();
  const item = await prisma.expense.create({
    data: {
      title: String(body.title || "").trim(),
      amount: Number(body.amount) || 0,
      category: String(body.category || "").trim(),
      month: String(body.month || "").trim(),
      description: body.description ? String(body.description) : null,
    },
  });
  return NextResponse.json(item);
}
