import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { clean, must, resourcesFor } from "@/lib/data";
import { fmtDate } from "@/lib/utils";
import { Badge, PageHeader, StatusBadge } from "@/components/shared/bits";
import { ChallengeBrief } from "@/components/shared/challenge-brief";
import { SubmissionCard } from "@/components/shared/submission-card";
import { StartChallenge, SubmitWork } from "@/components/student/controls";
import type { Challenge, ChallengeAssignment, Feedback, Submission } from "@/lib/types";

export default async function MyChallenge({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, student, profile, timezone } = await requireStudent();
  const { data } = await db.from("challenge_assignments").select("*, challenges(*)").eq("id", id).eq("student_id", student.id).maybeSingle();
  if (!data) notFound();
  const a = data as ChallengeAssignment & { challenges: Challenge };
  const [res, sr, fr] = await Promise.all([resourcesFor(db, "challenge_id", [a.challenge_id]),
    db.from("submissions").select("*").eq("challenge_assignment_id", id).order("created_at", { ascending: false }),
    db.from("teacher_feedback").select("*").eq("student_id", student.id)]);
  const subs = must<Submission[]>(sr), feedback = must<Feedback[]>(fr);
  const waiting = subs.some((s) => s.status === "submitted");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={{ href: "/student/challenges", label: "Challenges" }} title={a.challenges.title}
        subtitle={<span className="flex flex-wrap items-center gap-2"><Badge tone="blue">{a.challenges.category}</Badge><Badge>{a.challenges.difficulty}</Badge><StatusBadge status={a.status} />{a.deadline && <span>Due {fmtDate(a.deadline, "EEEE d MMMM")}</span>}</span>} />
      <ChallengeBrief c={{ ...a.challenges, instructions: clean(a.challenges.instructions) }} resources={res[a.challenge_id] ?? []} />
      <div className="mt-4 space-y-3">
        {subs.map((s) => <SubmissionCard key={s.id} s={s} timezone={timezone} feedback={feedback} heading="Your submission" />)}
        <div className="flex flex-wrap gap-2">
          {a.status === "not_started" && <StartChallenge id={id} />}
          {a.status !== "completed" && !waiting && <SubmitWork type="challenge" target={id} folder={`${profile.teacher_id}/${student.id}`} />}
        </div>
        {waiting && <p className="text-sm text-muted">Your teacher will check your work.</p>}
      </div>
    </div>
  );
}
