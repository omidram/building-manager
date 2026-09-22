import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ILLUSTRATIONS } from "@/lib/constants";

export default async function RulesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rules = await prisma.buildingRule.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <PageHeader
        title="نکات مهم و قوانین"
        subtitle="آیین‌نامه زندگی مشترک در ساختمان — شفاف، کوتاه و در دسترس همه."
        image={ILLUSTRATIONS.apartments}
      />

      <div className="space-y-4">
        {rules.map((r, i) => (
          <article key={r.id} className="surface grid gap-4 p-5 md:grid-cols-[80px_1fr]">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-teal-soft font-[family-name:var(--font-display)] text-3xl font-bold text-teal">
              {i + 1}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{r.title}</h2>
                <span className="badge bg-sky text-teal-deep">{r.category}</span>
              </div>
              <p className="mt-2 leading-8 text-muted">{r.body}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
