"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessagesSquare,
  Receipt,
  Sparkles,
  Ticket,
  Users,
  Vote,
  Wallet,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { NAV_ITEMS } from "@/lib/constants";
import { ShamsiClock } from "@/components/ShamsiClock";
import { ThemeToggle } from "@/components/ThemeToggle";

const ICONS = {
  LayoutDashboard,
  Megaphone,
  MessagesSquare,
  Ticket,
  Users,
  BookOpen,
  Vote,
  Wallet,
  Receipt,
  Sparkles,
} as const;

type UserLite = {
  name: string;
  role: string;
  unit: string | null;
  avatarHue: number;
};

export function AppShell({ user, children }: { user: UserLite; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside
        className={`shell-aside fixed inset-y-0 right-0 z-40 w-[260px] border-l backdrop-blur-md transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-full flex-col p-5">
          <div className="mb-8 flex items-center justify-between">
            <Link href="/dashboard" className="font-[family-name:var(--font-display)] text-3xl font-bold text-teal">
              همسایه
            </Link>
            <button className="lg:hidden text-ink" onClick={() => setOpen(false)} aria-label="بستن منو">
              <X size={20} />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = ICONS[item.icon];
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-teal text-white shadow-md shadow-teal/20" : "text-muted hover:bg-sky hover:text-ink"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 rounded-2xl border border-line bg-sky/60 p-3">
            <div className="flex items-center gap-3">
              <div
                className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white"
                style={{ background: `hsl(${user.avatarHue} 55% 42%)` }}
              >
                {user.name.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                <p className="truncate text-xs text-muted">
                  {user.role === "MANAGER" ? "مدیر ساختمان" : user.unit || "ساکن"}
                </p>
              </div>
            </div>
            <form action="/api/auth/logout" method="post" className="mt-3">
              <button type="submit" className="btn btn-secondary w-full text-sm">
                <LogOut size={16} />
                خروج
              </button>
            </form>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="min-w-0">
        <header className="shell-header sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-xl border border-line bg-elevated p-2 lg:hidden" onClick={() => setOpen(true)}>
              <Menu size={18} />
            </button>
            <ShamsiClock className="text-xs font-medium text-muted sm:text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="badge bg-teal-soft text-teal-deep hidden sm:inline-flex">ساختمان نمونه آروند</span>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
