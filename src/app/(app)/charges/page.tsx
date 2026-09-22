import Image from "next/image";
import { redirect } from "next/navigation";
import { getSessionUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/ui";
import { ILLUSTRATIONS } from "@/lib/constants";
import { chargeStatusLabel, formatToman, formatDate, formatDateTime, receiptMatchLabel } from "@/lib/format";
import { BankSettingsCard } from "./BankSettingsCard";
import { IssueChargesForm } from "./IssueChargesForm";
import { ReceiptUploadForm, BreakdownList } from "./ReceiptUploadForm";
import { ManagerReviewActions } from "./ManagerReviewActions";

export default async function ChargesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [charges, settings, expenses, me, walletTxs] = await Promise.all([
    prisma.charge.findMany({
      where: isManager(user) ? undefined : { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, unit: true, walletBalance: true } },
        receipts: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    }),
    prisma.buildingSettings.findUnique({ where: { id: "default" } }).then(
      (s) => s ?? prisma.buildingSettings.create({ data: { id: "default" } }),
    ),
    prisma.expense.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { walletBalance: true },
    }),
    prisma.walletTransaction.findMany({
      where: isManager(user) ? undefined : { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true, unit: true } } },
    }),
  ]);

  const paid = charges.filter((c) => c.status === "PAID").length;
  const pending = charges.filter((c) => c.status === "PENDING" || c.status === "OVERDUE").length;
  const partial = charges.filter((c) => c.status === "PARTIAL" || c.status === "UNDER_REVIEW").length;
  const totalPending = charges
    .filter((c) => c.status !== "PAID")
    .reduce((s, c) => s + Math.max(0, c.amount - c.paidAmount), 0);

  const latestMonth = expenses[0]?.month || "۱۴۰۴/۰۷";
  const monthExpenses = expenses.filter((e) => e.month === latestMonth);
  const residentCount = await prisma.user.count({ where: { role: "RESIDENT" } });
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const suggested = residentCount ? Math.ceil(monthTotal / residentCount / 1000) * 1000 : 0;
  const walletBalance = me?.walletBalance ?? 0;

  return (
    <div>
      <PageHeader
        title="شارژ ماهانه"
        subtitle="واریز فقط به حساب مدیریت، بررسی مقصد از روی رسید، کسری قرمز / مازاد سبز به کیف پول."
        image={ILLUSTRATIONS.sharing}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="پرداخت کامل" value={String(paid)} />
        <StatCard label="در انتظار" value={String(pending)} />
        <StatCard label="کسری / بررسی" value={String(partial)} />
        <StatCard label="جمع مانده" value={formatToman(totalPending)} />
        <div className="surface border-teal/30 p-5">
          <p className="text-sm text-muted">{isManager(user) ? "نمونه کیف پول شما" : "کیف پول شما"}</p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-teal">{formatToman(walletBalance)}</p>
          <p className="mt-1 text-xs text-muted">مازاد پرداخت‌ها اینجا ذخیره می‌شود</p>
        </div>
      </div>

      <div className="mb-6 grid gap-5 lg:grid-cols-2">
        <BankSettingsCard
          canEdit={isManager(user)}
          initial={{
            bankName: settings.bankName,
            accountHolder: settings.accountHolder,
            bankCardNumber: settings.bankCardNumber,
            bankAccountNumber: settings.bankAccountNumber,
            shebaNumber: settings.shebaNumber,
            paymentNote: settings.paymentNote,
          }}
        />
        {isManager(user) ? (
          <IssueChargesForm suggestedAmount={suggested} defaultMonth={latestMonth} />
        ) : (
          <div className="surface p-5">
            <h3 className="font-semibold text-teal-deep">آخرین تراکنش‌های کیف پول</h3>
            {walletTxs.length === 0 ? (
              <p className="mt-3 text-sm text-muted">هنوز اعتباری ثبت نشده.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {walletTxs.map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between rounded-xl bg-sky/50 px-3 py-2 text-sm">
                    <span className="text-muted">{tx.note || tx.type}</span>
                    <span className="font-semibold text-teal">+{formatToman(tx.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {isManager(user) && walletTxs.length > 0 && (
        <div className="surface mb-6 p-5">
          <h3 className="mb-3 font-semibold text-teal-deep">اعتبارهای اخیر ساکنان (مازاد)</h3>
          <ul className="space-y-2">
            {walletTxs.map((tx) => (
              <li key={tx.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                <span>
                  {tx.user.name} {tx.user.unit ? `· ${tx.user.unit}` : ""} — {tx.note || tx.type}
                </span>
                <span className="font-semibold text-teal">+{formatToman(tx.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {charges.map((c) => {
          const remaining = Math.max(0, c.amount - c.paidAmount);
          const latestReceipt = c.receipts[0];
          const canUpload = c.status !== "PAID" && (isManager(user) || c.userId === user.id);
          const surplus = latestReceipt?.surplus ?? 0;
          const shortfall = latestReceipt?.shortfall ?? remaining;

          return (
            <article key={c.id} className="surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-lg">
                    {c.month} · {c.user.name}
                  </p>
                  <p className="text-sm text-muted">{c.user.unit}</p>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-teal-deep">
                    {formatToman(c.amount)}
                  </p>
                  {c.paidAmount > 0 && (
                    <p className="text-xs text-muted">
                      اعمال‌شده روی شارژ: {formatToman(c.paidAmount)}
                      {c.paidAt ? ` · ${formatDate(c.paidAt)}` : ""}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.status === "PARTIAL" && shortfall > 0 && (
                      <span className="badge bg-coral-soft text-coral">کسری: {formatToman(shortfall)}</span>
                    )}
                    {c.status === "PAID" && surplus > 0 && (
                      <span className="badge bg-teal-soft text-teal">مازاد → کیف پول: {formatToman(surplus)}</span>
                    )}
                    {c.status === "PAID" && surplus === 0 && (
                      <span className="badge bg-teal-soft text-teal">سر به سر</span>
                    )}
                    {latestReceipt?.destinationOk === false && (
                      <span className="badge bg-coral-soft text-coral">مقصد نامعتبر</span>
                    )}
                    {latestReceipt?.destinationOk === true && (
                      <span className="badge bg-teal-soft text-teal">مقصد تأیید شد</span>
                    )}
                  </div>

                  {c.note && (
                    <p className={`mt-2 text-xs ${c.status === "PARTIAL" || latestReceipt?.destinationOk === false ? "text-coral" : "text-muted"}`}>
                      {c.note}
                    </p>
                  )}
                </div>
                <span
                  className={`badge ${
                    c.status === "PAID"
                      ? "bg-teal-soft text-teal"
                      : c.status === "PARTIAL" || c.status === "OVERDUE" || c.status === "REJECTED"
                        ? "bg-coral-soft text-coral"
                        : c.status === "UNDER_REVIEW"
                          ? "bg-gold-soft text-gold"
                          : "bg-sky text-teal-deep"
                  }`}
                >
                  {chargeStatusLabel[c.status]}
                </span>
              </div>

              <BreakdownList json={c.breakdownJson} />

              {latestReceipt && (
                <div className="mt-4 grid gap-3 rounded-2xl border border-line bg-white/80 p-3 md:grid-cols-[140px_1fr]">
                  <div className="relative h-28 overflow-hidden rounded-xl bg-sky">
                    <Image src={latestReceipt.imagePath} alt="رسید" fill className="object-cover" sizes="140px" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">آخرین رسید · {formatDateTime(latestReceipt.createdAt)}</p>
                    <p className="mt-1 text-muted">
                      وضعیت: {receiptMatchLabel[latestReceipt.matchStatus]}
                      {latestReceipt.ocrAmount != null ? ` · ${formatToman(latestReceipt.ocrAmount)}` : ""}
                    </p>
                    {latestReceipt.destinationInfo && (
                      <p
                        className={`mt-1 text-xs ${
                          latestReceipt.destinationOk === false
                            ? "text-coral"
                            : latestReceipt.destinationOk === true
                              ? "text-teal"
                              : "text-muted"
                        }`}
                      >
                        {latestReceipt.destinationInfo}
                      </p>
                    )}
                    {latestReceipt.shortfall > 0 && (
                      <p className="mt-1 font-semibold text-coral">کسری: {formatToman(latestReceipt.shortfall)}</p>
                    )}
                    {latestReceipt.surplus > 0 && (
                      <p className="mt-1 font-semibold text-teal">مازاد کیف پول: {formatToman(latestReceipt.surplus)}</p>
                    )}
                    {isManager(user) && (c.status === "UNDER_REVIEW" || c.status === "PARTIAL") && (
                      <ManagerReviewActions
                        chargeId={c.id}
                        receiptId={latestReceipt.id}
                        amount={c.amount}
                        ocrAmount={latestReceipt.ocrAmount}
                      />
                    )}
                  </div>
                </div>
              )}

              {canUpload && (
                <ReceiptUploadForm
                  chargeId={c.id}
                  amount={c.amount}
                  remaining={remaining || c.amount}
                  bank={{
                    bankCardNumber: settings.bankCardNumber,
                    bankAccountNumber: settings.bankAccountNumber,
                    shebaNumber: settings.shebaNumber,
                  }}
                />
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
