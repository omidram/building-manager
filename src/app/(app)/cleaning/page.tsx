import { redirect } from "next/navigation";
import { getSessionUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ILLUSTRATIONS } from "@/lib/constants";
import { ToggleCleaningButton } from "./ToggleCleaningButton";

export default async function CleaningPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const tasks = await prisma.cleaningTask.findMany({
    orderBy: { createdAt: "asc" },
    include: { assignee: { select: { name: true } } },
  });

  const done = tasks.filter((t) => t.completed).length;

  return (
    <div>
      <PageHeader
        title="مدیریت نظافت"
        subtitle="برنامه هفتگی نظافت مشاعات و پیگیری انجام کارها."
        image={ILLUSTRATIONS.steps}
      />

      <p className="mb-5 text-sm text-muted">
        انجام‌شده: {done} از {tasks.length}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {tasks.map((t) => (
          <article
            key={t.id}
            className={`surface p-5 ${t.completed ? "opacity-80" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-lg">{t.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {t.area} · {t.dayOfWeek}
                </p>
                {t.assignee && <p className="mt-1 text-xs text-muted">مسئول: {t.assignee.name}</p>}
              </div>
              <span className={`badge ${t.completed ? "bg-teal-soft text-teal" : "bg-gold-soft text-gold"}`}>
                {t.completed ? "انجام شد" : "باقی‌مانده"}
              </span>
            </div>
            {isManager(user) && (
              <div className="mt-4">
                <ToggleCleaningButton id={t.id} completed={t.completed} />
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
