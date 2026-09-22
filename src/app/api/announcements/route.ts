import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "MANAGER") {
    return NextResponse.json({ error: "فقط مدیریت" }, { status: 403 });
  }
  const body = await req.json();
  const item = await prisma.announcement.create({
    data: {
      title: String(body.title || "").trim(),
      body: String(body.body || "").trim(),
      important: Boolean(body.important),
      authorId: user.id,
    },
  });
  return NextResponse.json(item);
}
