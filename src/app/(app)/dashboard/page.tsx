import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { ILLUSTRATIONS } from "@/lib/constants";
import { formatToman, formatDate } from "@/lib/format";
import { redirect } from "next/navigation";
import { NotificationsPanel } from "@/components/NotificationsPanel";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [members, openTickets, activePolls, pendingCharges, announcements, expenses] = await Promise.all([
    prisma.user.count({ where: { role: "RESIDENT" } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.poll.count({ where: { status: "ACTIVE" } }),
    prisma.charge.count({ where: { status: { in: ["PENDING", "OVERDUE"] } } }),
    prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 3, include: { author: true } }),
    prisma.expense.findMany({ orderBy: { createdAt: "desc" }, take: 4 }),
  ]);

  const monthSpend = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHeader
        title={`سلام ${user.name.split(" ")[0]}`}
        subtitle="نمای کلی ساختمان؛ اعلان‌ها، وضعیت مالی و کارهای باز در یک نگاه."
        image={ILLUSTRATIONS.alley}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="ساکنان" value={String(members)} hint="اعضای فعال ساختمان" />
        <StatCard label="تیکت‌های باز" value={String(openTickets)} hint="نیازمند پیگیری" />
        <StatCard label="رأی‌گیری فعال" value={String(activePolls)} />
        <StatCard label="شارژ معوق/در انتظار" value={String(pendingCharges)} />
      </div>

      <div className="mb-6">
        <NotificationsPanel />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">آخرین اعلانات</h2>
            <Link href="/announcements" className="text-sm font-medium text-teal">
              مشاهده همه
            </Link>
          </div>
          <ul className="space-y-3">
            {announcements.map((a) => (
              <li key={a.id} className="rounded-2xl border border-line bg-white/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{a.title}</p>
                  {a.important && <span className="badge bg-coral-soft text-coral">مهم</span>}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{a.body}</p>
                <p className="mt-2 text-xs text-muted">{formatDate(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">هزینه‌های اخیر</h2>
            <Link href="/expenses" className="text-sm font-medium text-teal">
              ریز هزینه‌ها
            </Link>
          </div>
          <p className="mb-4 text-sm text-muted">جمع نمایش‌داده‌شده: {formatToman(monthSpend)}</p>
          <ul className="space-y-3">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-2xl border border-line bg-white/70 px-4 py-3">
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted">{e.category}</p>
                </div>
                <p className="text-sm font-semibold text-teal-deep">{formatToman(e.amount)}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { href: "/chat", label: "گفتگوی همگانی", tone: "btn-primary" },
          { href: "/tickets", label: "ارسال تیکت", tone: "btn-secondary" },
          { href: "/charges", label: "وضعیت شارژ", tone: "btn-coral" },
        ].map((a) => (
          <Link key={a.href} href={a.href} className={`btn ${a.tone}`}>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
