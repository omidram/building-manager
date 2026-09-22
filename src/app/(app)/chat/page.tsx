import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ILLUSTRATIONS } from "@/lib/constants";
import { CommunityChat } from "./CommunityChat";

export default async function ChatPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rows = await prisma.chatMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 80,
    select: {
      id: true,
      body: true,
      attachmentUrl: true,
      attachmentName: true,
      attachmentType: true,
      editedAt: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { id: true, name: true, unit: true, role: true, avatarHue: true } },
    },
  });

  const initialMessages = rows.reverse().map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="گفتگوی همگانی"
        subtitle="گروه چت ساختمان با پیام زنده، ویرایش، فایل/عکس و ایموجی."
        image={ILLUSTRATIONS.phone}
      />
      <CommunityChat initialMessages={initialMessages} currentUserId={user.id} />
    </div>
  );
}
