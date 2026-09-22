import { prisma } from "./prisma";

export async function creditWallet(opts: {
  userId: string;
  amount: number;
  type: string;
  note?: string;
  chargeId?: string;
}) {
  if (opts.amount <= 0) return null;

  const [tx] = await prisma.$transaction([
    prisma.walletTransaction.create({
      data: {
        userId: opts.userId,
        amount: opts.amount,
        type: opts.type,
        note: opts.note ?? null,
        chargeId: opts.chargeId ?? null,
      },
    }),
    prisma.user.update({
      where: { id: opts.userId },
      data: { walletBalance: { increment: opts.amount } },
    }),
  ]);

  return tx;
}
