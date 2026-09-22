import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "ورود لازم است" }, { status: 401 });

  const { pollId, optionId } = await req.json();
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll || poll.status !== "ACTIVE") {
    return NextResponse.json({ error: "رأی‌گیری فعال نیست" }, { status: 400 });
  }

  const existing = await prisma.voteBallot.findUnique({
    where: { pollId_userId: { pollId, userId: user.id } },
  });
  if (existing) return NextResponse.json({ error: "قبلاً رأی داده‌اید" }, { status: 400 });

  const ballot = await prisma.voteBallot.create({
    data: { pollId, optionId, userId: user.id },
  });
  return NextResponse.json(ballot);
}
