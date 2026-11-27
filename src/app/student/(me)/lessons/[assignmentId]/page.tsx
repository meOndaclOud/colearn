import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { activitiesFor, clean, must, resourcesFor } from "@/lib/data";
import { fmtDate, pct } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import { Detail, PageHeader, ProgressBar, Rich, StatusBadge } from "@/components/shared/bits";
import { ResourceLinks } from "@/components/shared/resource-links";
import { SubmissionCard } from "@/components/shared/submission-card";
import { StatusControl, SubmitWork } from "@/components/student/controls";
import { Badge } from "@/components/shared/bits";
import type { Feedback, Lesson, Submission } from "@/lib/types";

export default async function LessonView({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const { db, student, timezone, profile } = await requireStudent();
  // RLS only returns published assignments whose date has arrived
  const { data: a } = await db.from("lesson_assignments").select("*").eq("id", assignmentId).eq("student_id", student.id).maybeSingle();
  if (!a) notFound();
  const [lr, activities, res, pr, sr, fr] = await Promise.all([
    db.from("lessons").select("*").eq("id", a.lesson_id).single(),
    activitiesFor(db, a.lesson_id), resourcesFor(db, "lesson_id", [a.lesson_id]),
    db.from("progress_records").select("activity_id, status").eq("assignment_id", assignmentId),
    db.from("submissions").select("*").eq("assignment_id", assignmentId).eq("student_id", student.id).order("created_at", { ascending: false }),
    db.from("teacher_feedback").select("*").eq("student_id", student.id).order("created_at"),
  ]);
  const l = must<Lesson>(lr);
  const { data: subject } = l.subject_id ? await db.from("subjects").select("name").eq("id", l.subject_id).maybeSingle() : { data: null };
  const category = subject?.name;
  const status = Object.fromEntries(must<{ activity_id: string; status: string }[]>(pr).map((p) => [p.activity_id, p.status]));
  const subs = must<Submission[]>(sr), feedback = must<Feedback[]>(fr);
  const done = activities.filter((x) => status[x.id] === "completed").length;
  const folder = `${profile.teacher_id}/${student.id}`;
  const notes = (activityId: string | null) => feedback.filter((f) => f.assignment_id === assignmentId && f.activity_id === activityId && !f.submission_id)
    .map((f) => <p key={f.id} className="rounded-xl bg-teal-soft px-3 py-2 text-sm"><b>Teacher:</b> {f.body}</p>);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={{ href: "/student", label: "Today" }} title={l.title}
        subtitle={<span className="flex flex-wrap items-center gap-3">{category && <Badge tone="blue">{category}</Badge>}{fmtDate(a.scheduled_date, "EEEE d MMMM")}<span className="flex items-center gap-1"><Clock className="size-3.5" />{l.duration_minutes} min</span></span>} />
      <div className="mb-5 flex items-center gap-3"><ProgressBar value={pct(done, activities.length)} label="Lesson progress" /><span className="whitespace-nowrap text-sm font-semibold">{done}/{activities.length}</span></div>
      <Card className="space-y-4">
        <Detail label="What you will learn">{l.objectives}</Detail>
        <Rich html={clean(l.introduction)} />
        <section className="rounded-xl border border-brand/15 bg-brand-soft/50 p-4" aria-labelledby="lesson-instructions">
          <h2 id="lesson-instructions" className="mb-2 font-semibold">Your instructions</h2>
          {l.instructions ? <Rich html={clean(l.instructions)} /> : <p className="text-sm text-muted">Your teacher hasn’t added any specific instructions. Follow the activity steps below.</p>}
        </section>
        <Detail label="You will need">{l.materials}</Detail>
        <ResourceLinks items={res[l.id] ?? []} />
        {notes(null)}
      </Card>

      <ol className="mt-6 space-y-4">
        {activities.map((x, i) => {
          const s = status[x.id] ?? "not_started";
          const mine = subs.filter((v) => v.activity_id === x.id);
          const waiting = mine.some((v) => v.status === "submitted");
          return (
            <li key={x.id} className="animate-enter">
              <Card className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-semibold ${s === "completed" ? "bg-teal text-white" : "bg-brand-soft text-brand-dark"}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1"><CardTitle className="text-lg">{x.title}</CardTitle><p className="text-xs text-muted">About {x.estimated_minutes} minutes</p></div>
                  <StatusBadge status={s} />
                </div>
                {x.description && <p className="whitespace-pre-line text-sm">{x.description}</p>}
                <Rich html={clean(x.instructions)} />
                <Detail label="What you should have at the end">{x.expected_result}</Detail>
                <ResourceLinks items={x.resources} />
                {notes(x.id)}
                {mine.map((v) => <SubmissionCard key={v.id} s={v} timezone={timezone} feedback={feedback} heading="Your submission" />)}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                  <StatusControl assignmentId={assignmentId} activityId={x.id} status={s} requiresReview={x.requires_review} />
                  {x.requires_submission && !waiting && s !== "completed" && <SubmitWork type="activity" target={x.id} assignmentId={assignmentId} folder={folder} />}
                </div>
                {x.requires_submission && !mine.length && <p className="text-xs text-muted">Submit your work before marking this completed.</p>}
              </Card>
            </li>);
        })}
      </ol>
      {(l.expected_outcome || l.completion_criteria) && <Card className="mt-4 space-y-3"><Detail label="Expected outcome">{l.expected_outcome}</Detail><Detail label="You are finished when">{l.completion_criteria}</Detail></Card>}
    </div>
  );
}
