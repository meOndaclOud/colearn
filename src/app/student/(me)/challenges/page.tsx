import Link from "next/link";
import { Trophy } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { must } from "@/lib/data";
import { fmtDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge, Empty, PageHeader, StatusBadge } from "@/components/shared/bits";
import type { Challenge, ChallengeAssignment } from "@/lib/types";

export const metadata = { title: "Challenges" };

export default async function MyChallenges() {
  const { db, student, today } = await requireStudent();
  const rows = must<(ChallengeAssignment & { challenges: Challenge })[]>(await db.from("challenge_assignments").select("*, challenges(*)").eq("student_id", student.id).order("created_at", { ascending: false }));
  return (
    <>
      <PageHeader title="My challenges" subtitle="Extra projects to stretch your skills." />
      {!rows.length ? <Empty icon={Trophy} title="No challenges yet" /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map((a) => (
          <Link key={a.id} href={`/student/challenges/${a.id}`}><Card className="h-full transition hover:-translate-y-0.5 hover:shadow-lift">
            <div className="flex flex-wrap gap-1.5"><Badge tone="blue">{a.challenges.category}</Badge><Badge>{a.challenges.difficulty}</Badge></div>
            <p className="mt-3 font-semibold">{a.challenges.title}</p><p className="mt-1 line-clamp-2 text-sm text-muted">{a.challenges.description}</p>
            <p className="mt-3 line-clamp-2 text-sm"><span className="font-medium">Your instructions:</span> {a.challenges.instructions.replace(/<[^>]+>/g, " ").trim() || "Use the goal and submission details to guide your work."}</p>
            <div className="mt-3 flex items-center justify-between gap-2"><StatusBadge status={a.status} /><span className={`text-xs ${a.deadline && a.deadline < today ? "font-medium text-danger" : "text-muted"}`}>{a.deadline ? `Due ${fmtDate(a.deadline, "d MMM")}${a.deadline < today ? " · overdue" : ""}` : "No deadline"}</span></div>
            <p className="mt-3 text-sm font-medium text-brand">{a.status === "not_started" ? "Start challenge →" : a.status === "completed" ? "Review challenge →" : "Continue challenge →"}</p>
          </Card></Link>))}</div>
      )}
    </>
  );
}
