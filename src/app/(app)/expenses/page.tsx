import { redirect } from "next/navigation";
import { getSessionUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { ILLUSTRATIONS } from "@/lib/constants";
import { formatToman, formatDate } from "@/lib/format";
import { CreateExpenseForm } from "./CreateExpenseForm";

export default async function ExpensesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const expenses = await prisma.expense.findMany({ orderBy: { createdAt: "desc" } });
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="ریز هزینه‌های ماهانه"
        subtitle="شفافیت مالی ساختمان؛ هر هزینه با دسته و توضیح."
        image={ILLUSTRATIONS.care}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="جمع هزینه‌ها" value={formatToman(total)} />
        {Object.entries(byCategory)
          .slice(0, 3)
          .map(([cat, amount]) => (
            <StatCard key={cat} label={cat} value={formatToman(amount)} />
          ))}
      </div>

      {isManager(user) && (
        <div className="mb-6">
          <CreateExpenseForm />
        </div>
      )}

      <div className="overflow-hidden rounded-[1.25rem] border border-line bg-white shadow-[var(--shadow)]">
        <table className="w-full text-sm">
          <thead className="bg-sky/80 text-muted">
            <tr>
              <th className="px-4 py-3 text-right font-medium">عنوان</th>
              <th className="px-4 py-3 text-right font-medium">دسته</th>
              <th className="px-4 py-3 text-right font-medium">ماه</th>
              <th className="px-4 py-3 text-right font-medium">مبلغ</th>
              <th className="hidden px-4 py-3 text-right font-medium md:table-cell">تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <p className="font-medium">{e.title}</p>
                  {e.description && <p className="text-xs text-muted">{e.description}</p>}
                </td>
                <td className="px-4 py-3">{e.category}</td>
                <td className="px-4 py-3">{e.month}</td>
                <td className="px-4 py-3 font-semibold text-teal-deep">{formatToman(e.amount)}</td>
                <td className="hidden px-4 py-3 md:table-cell">{formatDate(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
