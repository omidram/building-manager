import { redirect } from "next/navigation";
import { getSessionUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ILLUSTRATIONS } from "@/lib/constants";
import { CreateAnnouncementForm } from "./CreateAnnouncementForm";
import { formatDate } from "@/lib/format";

export default async function AnnouncementsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const items = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  return (
    <div>
      <PageHeader
        title="اعلانات همگانی"
        subtitle="جلسات، اخبار مهم و پیام‌های مدیریت برای همه اعضا."
        image={ILLUSTRATIONS.special}
      />

      {isManager(user) && (
        <div className="mb-6">
          <CreateAnnouncementForm />
        </div>
      )}

      <div className="space-y-4">
        {items.map((a) => (
          <article key={a.id} className="surface p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{a.title}</h2>
              {a.important && <span className="badge bg-coral-soft text-coral">مهم</span>}
            </div>
            <p className="mt-3 leading-8 text-ink/90">{a.body}</p>
            <p className="mt-4 text-xs text-muted">
              {a.author.name} · {formatDate(a.createdAt)}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
