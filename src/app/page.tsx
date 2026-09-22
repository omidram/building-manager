import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Building2, MessageCircle, Vote, Wallet } from "lucide-react";
import { ILLUSTRATIONS } from "@/lib/constants";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 lg:px-6">
        <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-teal">همسایه</span>
        <Link href="/login" className="btn btn-primary text-sm">
          ورود به پنل
          <ArrowLeft size={16} />
        </Link>
      </header>

      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-4 lg:px-6 lg:pb-24 lg:pt-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-line shadow-[var(--shadow)]">
          <div className="absolute inset-0">
            <Image
              src={ILLUSTRATIONS.hero}
              alt="تصویر وکتور تهران"
              fill
              priority
              className="object-cover object-[center_35%]"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b2f2b]/92 via-[#0b2f2b]/45 to-[#0b2f2b]/20" />
          </div>

          <div className="relative flex min-h-[78vh] flex-col justify-end p-6 pb-10 text-white lg:min-h-[82vh] lg:p-12 lg:pb-14">
            <p className="fade-up font-[family-name:var(--font-display)] text-5xl font-bold leading-none tracking-tight lg:text-7xl">
              همسایه
            </p>
            <h1 className="fade-up-delay mt-4 max-w-2xl text-xl font-medium leading-9 text-white/95 lg:text-2xl lg:leading-10">
              پل ارتباطی شفاف میان ساکنان و مدیریت ساختمان
            </h1>
            <p className="fade-up-delay mt-3 max-w-xl text-sm leading-7 text-white/75 lg:text-base">
              اعلان‌ها، شارژ، رأی‌گیری، نظافت و تیکت‌ها — همه در یک فضای مینیمال و یکپارچه.
            </p>
            <div className="fade-up-delay mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn btn-primary">
                شروع کنید
              </Link>
              <a href="#features" className="btn btn-secondary">
                امکانات
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-10 lg:px-6 lg:py-16">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold text-ink">یک ساختمان، یک سیستم</h2>
          <p className="mt-3 text-muted leading-7">
            از هماهنگی اعضا تا ریز هزینه‌ها؛ همسایه برای مدیریت روزمره طراحی شده است.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {[
            {
              title: "اعلان و ارتباط",
              body: "جلسات، اخبار مهم و گفتگو با مدیریت بدون پراکندگی پیام‌رسان‌ها.",
              icon: MessageCircle,
              image: ILLUSTRATIONS.phone,
            },
            {
              title: "شارژ و هزینه",
              body: "ثبت شارژ ماهانه، وضعیت پرداخت و شفافیت ریز هزینه‌های ساختمان.",
              icon: Wallet,
              image: ILLUSTRATIONS.sharing,
            },
            {
              title: "رأی‌گیری جمعی",
              body: "تصمیم‌گیری درباره قوانین و سازوکارهای جدید با رأی شفاف اعضا.",
              icon: Vote,
              image: ILLUSTRATIONS.meeting,
            },
            {
              title: "زندگی هماهنگ",
              body: "قوانین، برنامه نظافت و مدیریت اعضا در یک داشبورد یکپارچه.",
              icon: Building2,
              image: ILLUSTRATIONS.balconies,
            },
          ].map((f) => (
            <article key={f.title} className="overflow-hidden rounded-[1.4rem] border border-line bg-white shadow-[var(--shadow)]">
              <div className="relative h-44">
                <Image src={f.image} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
              </div>
              <div className="p-5">
                <div className="mb-3 inline-flex rounded-full bg-teal-soft p-2 text-teal">
                  <f.icon size={18} />
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{f.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 lg:px-6 lg:py-16">
        <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] border border-line bg-white lg:grid-cols-2">
          <div className="relative min-h-72">
            <Image src={ILLUSTRATIONS.hand} alt="" fill className="object-cover" sizes="50vw" />
          </div>
          <div className="p-6 lg:p-10">
            <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold">ساخته‌شده برای جامعهٔ ساختمان</h2>
            <p className="mt-4 leading-8 text-muted">
              همسایه با الهام از تصویرسازی‌های مینیمال زندگی آپارتمانی طراحی شده تا مدیریت ساختمان حس اداری خشک نداشته باشد —
              شفاف، دوستانه و منظم.
            </p>
            <Link href="/login" className="btn btn-coral mt-6">
              ورود آزمایشی
            </Link>
            <p className="mt-4 text-xs text-muted">مدیر: manager@hamsaye.local — ساکن: ali@hamsaye.local — رمز: 123456</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-line/80 py-8 text-center text-sm text-muted">
        همسایه — سیستم مدیریت ساختمان مسکونی
      </footer>
    </div>
  );
}
