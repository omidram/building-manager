import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "MANAGER") {
    return NextResponse.json({ error: "فقط مدیریت" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = await req.json();
  const updated = await prisma.cleaningTask.update({
    where: { id },
    data: { completed: Boolean(body.completed) },
  });
  return NextResponse.json(updated);
}
