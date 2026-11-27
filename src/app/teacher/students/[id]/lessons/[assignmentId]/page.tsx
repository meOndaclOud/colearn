import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { activitiesFor, must } from "@/lib/data";
import { fmtDate, fmtDateTime, pct } from "@/lib/utils";
import { STATUS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader, ProgressBar, StatusBadge } from "@/components/shared/bits";
import { QuickSelect } from "@/components/shared/action-button";
import { FeedbackForm } from "@/components/teacher/forms";
import { teacherSetActivity } from "@/actions/lessons";
import type { Feedback, Progress } from "@/lib/types";

/** One student's progress on one lesson: quick status changes and feedback. */
export default async function AssignmentReview({ params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { id, assignmentId } = await params;
  const { db, profile } = await requireTeacher();
  const { data: a } = await db.from("lesson_assignments").select("*, lessons(title), students(full_name)").eq("id", assignmentId).eq("student_id", id).maybeSingle();
  if (!a) notFound();
  const [activities, prog, fb, progressRes] = await Promise.all([
    activitiesFor(db, a.lesson_id),
    db.from("progress_records").select("activity_id, status, completed_at").eq("assignment_id", assignmentId),
    db.from("teacher_feedback").select("*").eq("assignment_id", assignmentId).order("created_at", { ascending: false }),
    db.from("assignment_progress").select("*").eq("assignment_id", assignmentId).single(),
  ]);
  const status = Object.fromEntries(must<{ activity_id: string; status: string; completed_at: string | null }[]>(prog).map((p) => [p.activity_id, p]));
  const summary = must<Progress>(progressRes);
  const feedback = must<Feedback[]>(fb);
  const notes = (activityId: string | null) => feedback.filter((f) => f.activity_id === activityId).map((f) => <p key={f.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">{f.body} <span className="text-xs text-muted">({f.kind})</span></p>);
  return (
    <>
      <PageHeader back={{ href: `/teacher/students/${id}?tab=lessons`, label: a.students.full_name }} title={a.lessons.title} subtitle={`${a.students.full_name} · ${fmtDate(a.scheduled_date, "EEEE d MMMM")}`}>
        <Button asChild variant="outline"><Link href={`/teacher/planner/lessons/${a.lesson_id}`}><Pencil />Edit lesson</Link></Button>
      </PageHeader>
      <Card className="mb-4 space-y-2">
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{summary.activity_total ? `${summary.completed} of ${summary.total} activities completed` : summary.lesson_status === "completed" ? "Instruction-only lesson completed" : "Instruction-only lesson"}</p><StatusBadge status={summary.lesson_status} /></div>
        <ProgressBar value={pct(summary.completed, summary.total)} label="Lesson progress" />
      </Card>
      <div className="space-y-3">
        {activities.map((x, i) => (
          <Card key={x.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{i + 1}. {x.title}</p>
              <QuickSelect label={`Status of ${x.title}`} action={teacherSetActivity} input={{ assignment_id: assignmentId, activity_id: x.id }} field="status" value={status[x.id]?.status ?? "not_started"}
                options={["not_started", "in_progress", "awaiting_review", "completed"].map((k) => [k, STATUS[k].label])} />
            </div>
            {status[x.id]?.completed_at && <p className="text-xs text-muted">Completed {fmtDateTime(status[x.id].completed_at, profile.timezone)}</p>}
            {notes(x.id)}
            <FeedbackForm compact studentId={id} assignmentId={assignmentId} activityId={x.id} />
          </Card>))}
        <Card className="space-y-3"><p className="font-medium">Feedback for the whole lesson</p>{notes(null)}<FeedbackForm studentId={id} assignmentId={assignmentId} /></Card>
      </div>
    </>
  );
}
