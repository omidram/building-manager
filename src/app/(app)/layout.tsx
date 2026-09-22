import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    // Don't mutate cookies here (not allowed in Server Components).
    // force=1 makes middleware clear the stale session cookie.
    redirect("/login?force=1");
  }

  return <AppShell user={user}>{children}</AppShell>;
}
