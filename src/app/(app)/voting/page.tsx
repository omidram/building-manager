import { redirect } from "next/navigation";
import { getSessionUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ILLUSTRATIONS } from "@/lib/constants";
import { VoteForm } from "./VoteForm";
import { CreatePollForm } from "./CreatePollForm";
import { formatDate } from "@/lib/format";

export default async function VotingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const polls = await prisma.poll.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      options: { include: { _count: { select: { votes: true } } } },
      ballots: { where: { userId: user.id } },
      _count: { select: { ballots: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="رأی‌گیری"
        subtitle="تصمیم‌گیری جمعی برای قوانین و سازوکارهای جدید ساختمان."
        image={ILLUSTRATIONS.meeting}
      />

      {isManager(user) && (
        <div className="mb-6">
          <CreatePollForm />
        </div>
      )}

      <div className="space-y-5">
        {polls.map((poll) => {
          const total = poll._count.ballots || 1;
          const myVote = poll.ballots[0];
          return (
            <article key={poll.id} className="surface p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{poll.title}</h2>
                <span className={`badge ${poll.status === "ACTIVE" ? "bg-teal-soft text-teal" : "bg-line text-muted"}`}>
                  {poll.status === "ACTIVE" ? "فعال" : "بسته"}
                </span>
              </div>
              <p className="mt-2 leading-8 text-muted">{poll.description}</p>
              {poll.endsAt && <p className="mt-1 text-xs text-muted">مهلت: {formatDate(poll.endsAt)}</p>}

              <div className="mt-5 space-y-3">
                {poll.options.map((opt) => {
                  const count = opt._count.votes;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={opt.id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{opt.label}</span>
                        <span className="text-muted">
                          {count} رأی ({pct}٪)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full bg-teal" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {poll.status === "ACTIVE" && !myVote && (
                <div className="mt-5">
                  <VoteForm pollId={poll.id} options={poll.options.map((o) => ({ id: o.id, label: o.label }))} />
                </div>
              )}
              {myVote && <p className="mt-4 text-sm text-teal">رأی شما ثبت شده است.</p>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
