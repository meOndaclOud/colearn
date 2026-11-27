import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { activitiesFor, must } from "@/lib/data";
import { fmtDate } from "@/lib/utils";
import { STATUS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/bits";
import { QuickSelect } from "@/components/shared/action-button";
import { FeedbackForm } from "@/components/teacher/forms";
import { teacherSetActivity } from "@/actions/lessons";
import type { Feedback } from "@/lib/types";

/** One student's progress on one lesson: quick status changes and feedback. */
export default async function AssignmentReview({ params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  const { id, assignmentId } = await params;
  const { db } = await requireTeacher();
  const { data: a } = await db.from("lesson_assignments").select("*, lessons(title), students(full_name)").eq("id", assignmentId).eq("student_id", id).maybeSingle();
  if (!a) notFound();
  const [activities, prog, fb] = await Promise.all([
    activitiesFor(db, a.lesson_id),
    db.from("progress_records").select("activity_id, status").eq("assignment_id", assignmentId),
    db.from("teacher_feedback").select("*").eq("assignment_id", assignmentId).order("created_at", { ascending: false }),
  ]);
  const status = Object.fromEntries(must<{ activity_id: string; status: string }[]>(prog).map((p) => [p.activity_id, p.status]));
  const feedback = must<Feedback[]>(fb);
  const notes = (activityId: string | null) => feedback.filter((f) => f.activity_id === activityId).map((f) => <p key={f.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">{f.body} <span className="text-xs text-muted">({f.kind})</span></p>);
  return (
    <>
      <PageHeader back={{ href: `/teacher/students/${id}?tab=lessons`, label: a.students.full_name }} title={a.lessons.title} subtitle={`${a.students.full_name} · ${fmtDate(a.scheduled_date, "EEEE d MMMM")}`}>
        <Button asChild variant="outline"><Link href={`/teacher/planner/lessons/${a.lesson_id}`}><Pencil />Edit lesson</Link></Button>
      </PageHeader>
      <div className="space-y-3">
        {activities.map((x, i) => (
          <Card key={x.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{i + 1}. {x.title}</p>
              <QuickSelect label={`Status of ${x.title}`} action={teacherSetActivity} input={{ assignment_id: assignmentId, activity_id: x.id }} field="status" value={status[x.id] ?? "not_started"}
                options={["not_started", "in_progress", "awaiting_review", "completed"].map((k) => [k, STATUS[k].label])} />
            </div>
            {notes(x.id)}
            <FeedbackForm compact studentId={id} assignmentId={assignmentId} activityId={x.id} />
          </Card>))}
        <Card className="space-y-3"><p className="font-medium">Feedback for the whole lesson</p>{notes(null)}<FeedbackForm studentId={id} assignmentId={assignmentId} /></Card>
      </div>
    </>
  );
}
