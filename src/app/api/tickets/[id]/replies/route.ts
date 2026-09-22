import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "ورود لازم است" }, { status: 401 });

  const { id } = await ctx.params;
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  if (user.role !== "MANAGER" && ticket.authorId !== user.id) {
    return NextResponse.json({ error: "دسترسی ندارید" }, { status: 403 });
  }

  const body = await req.json();
  const reply = await prisma.ticketReply.create({
    data: {
      ticketId: id,
      authorId: user.id,
      body: String(body.body || "").trim(),
    },
  });

  await prisma.ticket.update({
    where: { id },
    data: {
      updatedAt: new Date(),
      status: user.role === "MANAGER" && ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status,
    },
  });

  return NextResponse.json(reply);
}
