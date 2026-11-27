import Link from "next/link";
import { ArrowRight, CalendarDays, Trophy } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { must } from "@/lib/data";
import { STATUS } from "@/lib/constants";
import { fmtDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge, Empty, PageHeader } from "@/components/shared/bits";
import type { Challenge, ChallengeAssignment } from "@/lib/types";

export const metadata = { title: "Challenges" };

export default async function MyChallenges() {
  const { db, student, today } = await requireStudent();
  const rows = must<(ChallengeAssignment & { challenges: Challenge })[]>(await db.from("challenge_assignments").select("*, challenges(*)").eq("student_id", student.id).order("created_at", { ascending: false }));
  return (
    <>
      <PageHeader title="My challenges" subtitle="Pick a challenge, explore an idea, and see what you can create." />
      {!rows.length ? <Empty icon={Trophy} title="No challenges yet" /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map((a) => {
          const overdue = Boolean(a.deadline && a.deadline < today && a.status !== "completed");
          return (
            <Card key={a.id} className="group flex h-full flex-col gap-5 overflow-hidden rounded-2xl border-line/80 p-5 shadow-soft transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-lift">
              <div className="flex flex-wrap items-start justify-between gap-2.5">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="blue">{a.challenges.category}</Badge>
                  <Badge>{a.challenges.difficulty}</Badge>
                </div>
                <Badge tone="blue">{STATUS[a.status]?.label ?? a.status}</Badge>
              </div>

              <div className="min-h-24">
                <h2 className="text-lg font-semibold leading-snug tracking-tight text-ink">{a.challenges.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{a.challenges.description || "Open the challenge to explore the goal and get started."}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium ${overdue ? "bg-danger-soft text-danger" : "bg-slate-50 text-muted"}`}>
                  <CalendarDays className="size-3.5" />
                  {a.deadline ? `Due ${fmtDate(a.deadline, "d MMM")}` : "No due date"}
                </span>
                {overdue && <span className="font-semibold text-danger">Overdue</span>}
              </div>

              <div className="mt-auto border-t border-line/80 pt-3">
                <Link href={`/student/challenges/${a.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand transition-colors group-hover:text-brand-dark">
                  View challenge <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </Card>
          );
        })}</div>
      )}
    </>
  );
}
