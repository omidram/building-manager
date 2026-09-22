import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const messageSelect = {
  id: true,
  body: true,
  attachmentUrl: true,
  attachmentName: true,
  attachmentType: true,
  editedAt: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: { id: true, name: true, unit: true, role: true, avatarHue: true },
  },
} as const;

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "ورود لازم است" }, { status: 401 });

  const after = req.nextUrl.searchParams.get("after");
  const since = req.nextUrl.searchParams.get("since"); // updates cursor
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 80), 150);

  if (since) {
    const updated = await prisma.chatMessage.findMany({
      where: { updatedAt: { gt: new Date(since) } },
      orderBy: { updatedAt: "asc" },
      take: limit,
      select: messageSelect,
    });
    return NextResponse.json(updated);
  }

  const messages = await prisma.chatMessage.findMany({
    where: after ? { createdAt: { gt: new Date(after) } } : undefined,
    orderBy: { createdAt: after ? "asc" : "desc" },
    take: limit,
    select: messageSelect,
  });

  return NextResponse.json(after ? messages : messages.reverse());
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "ورود لازم است" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  let text = "";
  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;
  let attachmentType: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    text = String(form.get("body") || "").trim();
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      if (file.size > 12 * 1024 * 1024) {
        return NextResponse.json({ error: "حجم فایل حداکثر ۱۲ مگابایت" }, { status: 400 });
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      const safeName = file.name.replace(/[^\w.\u0600-\u06FF-]+/g, "_").slice(0, 80);
      const ext = path.extname(safeName) || (file.type.startsWith("image/") ? ".jpg" : "");
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "chat");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, fileName), bytes);
      attachmentUrl = `/uploads/chat/${fileName}`;
      attachmentName = file.name;
      attachmentType = file.type || "application/octet-stream";
    }
  } else {
    const body = await req.json().catch(() => null);
    text = String(body?.body || "").trim();
  }

  if (!text && !attachmentUrl) {
    return NextResponse.json({ error: "پیام یا فایل لازم است" }, { status: 400 });
  }
  if (text.length > 2000) return NextResponse.json({ error: "پیام خیلی طولانی است" }, { status: 400 });

  const message = await prisma.chatMessage.create({
    data: {
      body: text,
      authorId: user.id,
      attachmentUrl,
      attachmentName,
      attachmentType,
    },
    select: messageSelect,
  });

  return NextResponse.json(message);
}
