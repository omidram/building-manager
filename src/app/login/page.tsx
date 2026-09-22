"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ILLUSTRATIONS } from "@/lib/constants";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ShamsiClock } from "@/components/ShamsiClock";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("manager@hamsaye.local");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "ورود ناموفق بود");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative mx-auto grid min-h-screen max-w-5xl items-center gap-0 px-4 py-10 lg:grid-cols-2 lg:px-6">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-3 lg:left-6 lg:top-6">
        <ThemeToggle />
        <ShamsiClock className="hidden text-xs text-muted sm:inline" />
      </div>
      <div className="relative hidden min-h-[560px] overflow-hidden rounded-r-none rounded-l-[2rem] border border-l-0 border-line lg:block">
        <Image src={ILLUSTRATIONS.poster} alt="" fill className="object-cover" priority sizes="50vw" />
      </div>

      <div className="surface rounded-[2rem] border-line p-7 lg:rounded-l-none lg:p-10">
        <Link href="/" className="font-[family-name:var(--font-display)] text-3xl font-bold text-teal">
          همسایه
        </Link>
        <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-bold">ورود به پنل</h1>
        <p className="mt-2 text-sm text-muted">با حساب مدیر یا ساکن وارد شوید.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="label" htmlFor="email">
              ایمیل
            </label>
            <input
              id="email"
              className="field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              رمز عبور
            </label>
            <input
              id="password"
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              dir="ltr"
            />
          </div>
          {error && <p className="text-sm text-coral">{error}</p>}
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading ? "در حال ورود..." : "ورود"}
          </button>
        </form>

        <div className="mt-6 space-y-2 rounded-2xl bg-sky/70 p-4 text-xs leading-6 text-muted">
          <p>
            <button type="button" className="font-semibold text-teal" onClick={() => setEmail("manager@hamsaye.local")}>
              مدیر:
            </button>{" "}
            manager@hamsaye.local
          </p>
          <p>
            <button type="button" className="font-semibold text-teal" onClick={() => setEmail("ali@hamsaye.local")}>
              ساکن:
            </button>{" "}
            ali@hamsaye.local
          </p>
          <p>رمز هر دو: 123456</p>
        </div>
      </div>
    </div>
  );
}
