import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { messageSelect } from "../route";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "ورود لازم است" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.chatMessage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  if (existing.authorId !== user.id && user.role !== "MANAGER") {
    return NextResponse.json({ error: "اجازه ویرایش ندارید" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  if (!text && !existing.attachmentUrl) {
    return NextResponse.json({ error: "متن پیام خالی است" }, { status: 400 });
  }
  if (text.length > 2000) return NextResponse.json({ error: "پیام خیلی طولانی است" }, { status: 400 });

  const message = await prisma.chatMessage.update({
    where: { id },
    data: { body: text, editedAt: new Date() },
    select: messageSelect,
  });

  return NextResponse.json(message);
}
