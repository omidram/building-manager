import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ILLUSTRATIONS } from "@/lib/constants";
import { ticketStatusLabel, formatDateTime } from "@/lib/format";
import { CreateTicketForm } from "./CreateTicketForm";

export default async function TicketsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const tickets = await prisma.ticket.findMany({
    where: isManager(user) ? undefined : { authorId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      author: { select: { name: true, unit: true } },
      _count: { select: { replies: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="تیکت پشتیبانی"
        subtitle="درخواست‌های رسمی و پیگیری مشکلات با مدیریت — جدا از گفتگوی همگانی."
        image={ILLUSTRATIONS.phone}
      />

      <div className="mb-6">
        <CreateTicketForm />
      </div>

      <div className="space-y-3">
        {tickets.map((t) => (
          <Link key={t.id} href={`/tickets/${t.id}`} className="surface block p-4 transition hover:-translate-y-0.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{t.title}</h2>
              <span
                className={`badge ${
                  t.status === "OPEN"
                    ? "bg-coral-soft text-coral"
                    : t.status === "IN_PROGRESS"
                      ? "bg-gold-soft text-gold"
                      : "bg-teal-soft text-teal"
                }`}
              >
                {ticketStatusLabel[t.status]}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted">{t.body}</p>
            <p className="mt-3 text-xs text-muted">
              {t.author.name}
              {t.author.unit ? ` · ${t.author.unit}` : ""} · {formatDateTime(t.updatedAt)} · {t._count.replies} پاسخ
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
