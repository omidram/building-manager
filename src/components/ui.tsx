import Image from "next/image";

export function PageHeader({
  title,
  subtitle,
  image,
  action,
}: {
  title: string;
  subtitle?: string;
  image?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 overflow-hidden rounded-[1.5rem] border border-line bg-white shadow-[var(--shadow)]">
      <div className={`grid gap-0 ${image ? "lg:grid-cols-[1.3fr_1fr]" : ""}`}>
        <div className="flex flex-col justify-center gap-3 p-6 lg:p-8">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold text-ink lg:text-5xl">{title}</h1>
          {subtitle && <p className="max-w-xl text-muted leading-7">{subtitle}</p>}
          {action && <div className="mt-2">{action}</div>}
        </div>
        {image && (
          <div className="relative min-h-44 overflow-hidden bg-sky">
            <Image src={image} alt="" fill className="object-cover object-center" sizes="(max-width:1024px) 100vw, 40vw" />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-white/10" />
          </div>
        )}
      </div>
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-teal-deep">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface p-10 text-center">
      <p className="font-[family-name:var(--font-display)] text-2xl font-semibold">{title}</p>
      <p className="mt-2 text-muted">{body}</p>
    </div>
  );
}
