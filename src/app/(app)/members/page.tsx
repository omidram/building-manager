import { redirect } from "next/navigation";
import { getSessionUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ILLUSTRATIONS } from "@/lib/constants";

export default async function MembersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const members = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { unit: "asc" }],
    select: { id: true, name: true, email: true, phone: true, unit: true, role: true, avatarHue: true },
  });

  return (
    <div>
      <PageHeader
        title="مدیریت اعضا"
        subtitle="فهرست ساکنان و نقش‌ها؛ پل ارتباطی ساختاریافته میان اعضا و مدیریت."
        image={ILLUSTRATIONS.neighbors}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((m) => (
          <article key={m.id} className="surface p-5">
            <div className="flex items-center gap-3">
              <div
                className="grid h-12 w-12 place-items-center rounded-full text-lg font-bold text-white"
                style={{ background: `hsl(${m.avatarHue} 55% 42%)` }}
              >
                {m.name.slice(0, 1)}
              </div>
              <div>
                <h2 className="font-semibold">{m.name}</h2>
                <p className="text-sm text-muted">{m.unit || "—"}</p>
              </div>
            </div>
            <div className="mt-4 space-y-1 text-sm text-muted">
              <p dir="ltr" className="text-right">
                {m.email}
              </p>
              {m.phone && (
                <p dir="ltr" className="text-right">
                  {m.phone}
                </p>
              )}
            </div>
            <span className={`badge mt-4 ${m.role === "MANAGER" ? "bg-gold-soft text-gold" : "bg-teal-soft text-teal-deep"}`}>
              {m.role === "MANAGER" ? "مدیر" : "ساکن"}
            </span>
            {isManager(user) && m.role === "RESIDENT" && (
              <p className="mt-3 text-xs text-muted">قابل مدیریت از پنل مدیر</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
