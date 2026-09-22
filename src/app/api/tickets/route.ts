import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "ورود لازم است" }, { status: 401 });
  const body = await req.json();
  const ticket = await prisma.ticket.create({
    data: {
      title: String(body.title || "").trim(),
      body: String(body.body || "").trim(),
      authorId: user.id,
    },
  });
  return NextResponse.json(ticket);
}
