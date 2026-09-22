import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { messageSelect } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Server-Sent Events stream for live community chat */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let lastCreated = req.nextUrl.searchParams.get("after");
  let lastUpdated = req.nextUrl.searchParams.get("since") || lastCreated;
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("ready", { ok: true });

      const tick = async () => {
        if (closed) return;
        try {
          const created = await prisma.chatMessage.findMany({
            where: lastCreated ? { createdAt: { gt: new Date(lastCreated) } } : undefined,
            orderBy: { createdAt: "asc" },
            take: 50,
            select: messageSelect,
          });
          if (created.length) {
            lastCreated = created[created.length - 1]!.createdAt.toISOString();
            send("messages", created);
          }

          if (lastUpdated) {
            const updated = await prisma.chatMessage.findMany({
              where: {
                updatedAt: { gt: new Date(lastUpdated) },
                ...(lastCreated ? { createdAt: { lte: new Date(lastCreated) } } : {}),
                editedAt: { not: null },
              },
              orderBy: { updatedAt: "asc" },
              take: 50,
              select: messageSelect,
            });
            if (updated.length) {
              lastUpdated = updated[updated.length - 1]!.updatedAt.toISOString();
              send("updates", updated);
            }
          }

          if (!created.length) send("ping", { t: Date.now() });
        } catch (err) {
          send("error", { message: "poll_failed" });
          console.error(err);
        }
      };

      const interval = setInterval(tick, 1500);
      void tick();

      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(`: keepalive\n\n`));
      }, 15000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
