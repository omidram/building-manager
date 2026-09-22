import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "MANAGER") {
    return NextResponse.json({ error: "فقط مدیریت" }, { status: 403 });
  }
  const body = await req.json();
  const options: string[] = Array.isArray(body.options) ? body.options : [];
  if (options.length < 2) {
    return NextResponse.json({ error: "حداقل دو گزینه" }, { status: 400 });
  }

  const poll = await prisma.poll.create({
    data: {
      title: String(body.title || "").trim(),
      description: String(body.description || "").trim(),
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      options: { create: options.map((label) => ({ label })) },
    },
  });
  return NextResponse.json(poll);
}
