import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketStatusLabel, formatDateTime } from "@/lib/format";
import { ReplyForm } from "./ReplyForm";
import { StatusSelect } from "./StatusSelect";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, unit: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: true, avatarHue: true } } },
      },
    },
  });

  if (!ticket) notFound();
  if (!isManager(user) && ticket.authorId !== user.id) redirect("/tickets");

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/tickets" className="text-sm text-teal">
        ← بازگشت به تیکت‌ها
      </Link>

      <article className="surface mt-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">{ticket.title}</h1>
            <p className="mt-2 text-sm text-muted">
              {ticket.author.name}
              {ticket.author.unit ? ` · ${ticket.author.unit}` : ""} · {formatDateTime(ticket.createdAt)}
            </p>
          </div>
          <span className="badge bg-teal-soft text-teal">{ticketStatusLabel[ticket.status]}</span>
        </div>
        <p className="mt-5 leading-8">{ticket.body}</p>
        {isManager(user) && (
          <div className="mt-4">
            <StatusSelect id={ticket.id} status={ticket.status} />
          </div>
        )}
      </article>

      <div className="mt-6 space-y-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">پاسخ‌ها</h2>
        {ticket.replies.map((r) => (
          <div key={r.id} className="surface flex gap-3 p-4">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: `hsl(${r.author.avatarHue} 55% 42%)` }}
            >
              {r.author.name.slice(0, 1)}
            </div>
            <div>
              <p className="text-sm font-semibold">
                {r.author.name}
                <span className="mr-2 text-xs font-normal text-muted">
                  {r.author.role === "MANAGER" ? "مدیر" : "ساکن"} · {formatDateTime(r.createdAt)}
                </span>
              </p>
              <p className="mt-1 leading-7">{r.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <ReplyForm ticketId={ticket.id} />
      </div>
    </div>
  );
}
