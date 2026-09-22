import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";
import { MarkNotificationsRead } from "./MarkNotificationsRead";

export async function NotificationsPanel() {
  const user = await getSessionUser();
  if (!user) return null;

  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const unread = items.filter((n) => !n.read).length;

  return (
    <section className="surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          اعلان‌ها
          {unread > 0 && <span className="mr-2 badge bg-coral-soft text-coral">{unread} جدید</span>}
        </h2>
        {unread > 0 && <MarkNotificationsRead />}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted">اعلانی نیست.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-2xl border px-4 py-3 ${n.read ? "border-line bg-white/50" : "border-teal/30 bg-teal-soft/40"}`}
            >
              <p className="font-semibold text-sm">{n.title}</p>
              <p className="mt-1 text-sm leading-6 text-muted">{n.body}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span>{formatDateTime(n.createdAt)}</span>
                {n.link && (
                  <Link href={n.link} className="text-teal">
                    مشاهده
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
