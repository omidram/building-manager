import { prisma } from "./prisma";

export async function notifyManagers(title: string, body: string, link?: string) {
  const managers = await prisma.user.findMany({ where: { role: "MANAGER" }, select: { id: true } });
  if (!managers.length) return;
  await prisma.notification.createMany({
    data: managers.map((m) => ({
      userId: m.id,
      title,
      body,
      link: link ?? null,
    })),
  });
}

export async function notifyUser(userId: string, title: string, body: string, link?: string) {
  await prisma.notification.create({
    data: { userId, title, body, link: link ?? null },
  });
}
