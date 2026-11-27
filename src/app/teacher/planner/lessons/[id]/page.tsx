import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCopy, Copy, Trash2 } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { activitiesFor, must, resourcesFor } from "@/lib/data";
import { getStudents, options } from "@/lib/queries";
import { editorData } from "@/lib/editor-data";
import { fmtDate } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeader, StatusBadge, Badge } from "@/components/shared/bits";
import { ActionButton, QuickSelect } from "@/components/shared/action-button";
import { LessonEditor } from "@/components/editor/lesson-editor";
import { ScheduleDialog } from "@/components/teacher/schedule-dialog";
import { AssignmentDate } from "@/components/teacher/assignment-date";
import { deleteLesson, duplicateLesson, removeAssignment, updateAssignment } from "@/actions/lessons";
import type { Lesson, Progress } from "@/lib/types";

export const metadata = { title: "Edit lesson" };

export default async function EditLesson({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, profile, today } = await requireTeacher();
  const { data } = await db.from("lessons").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const l = data as Lesson;
  const [activities, res, notes, assigned, students, extra] = await Promise.all([
    activitiesFor(db, id), resourcesFor(db, "lesson_id", [id]), db.from("lesson_notes").select("notes").eq("lesson_id", id).maybeSingle(),
    db.from("assignment_progress").select("*").eq("lesson_id", id).order("scheduled_date"), getStudents(db), editorData(db, id),
  ]);
  const rows = must<Progress[]>(assigned);
  const name = (sid: string) => students.find((s) => s.id === sid)?.full_name ?? "";
  return (
    <>
      <PageHeader back={{ href: "/teacher/planner", label: "Lesson Planner" }} title={l.title} subtitle={l.is_template ? <Badge tone="amber">Template</Badge> : `${rows.length} scheduled assignment(s)`}>
        {!l.is_template && <ScheduleDialog lessons={[]} lessonId={id} students={options(students)} today={today} label="Schedule / assign" />}
        <ActionButton variant="outline" action={duplicateLesson} input={{ id, template: false }} redirectTo="/teacher/planner/lessons/:id" success="Copy created"><Copy />{l.is_template ? "Use template" : "Duplicate"}</ActionButton>
        {!l.is_template && <ActionButton variant="outline" action={duplicateLesson} input={{ id, template: true }} success="Saved as template"><BookCopy />Save as template</ActionButton>}
        <ActionButton variant="danger" action={deleteLesson} input={{ id }} redirectTo="/teacher/planner" success="Lesson deleted" confirm="Delete this lesson? All its schedules, student progress and submissions are deleted too."><Trash2 />Delete</ActionButton>
      </PageHeader>

      {rows.length > 0 && (
        <Card className="mb-5">
          <CardTitle className="mb-2">Scheduled for</CardTitle>
          <p className="mb-3 text-xs text-muted">Editing this lesson changes it for everyone listed. Duplicate it first if you want a different version.</p>
          <ul className="max-h-64 divide-y divide-line overflow-y-auto">{rows.map((r) => (
            <li key={r.assignment_id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <Link href={`/teacher/students/${r.student_id}/lessons/${r.assignment_id}`} className="min-w-40 flex-1 font-medium hover:text-brand">{name(r.student_id)}<span className="ml-2 text-xs font-normal text-muted">{r.completed}/{r.total} done</span></Link>
              <AssignmentDate id={r.assignment_id} value={r.scheduled_date} label={`Date for ${name(r.student_id)}, ${fmtDate(r.scheduled_date)}`} />
              <QuickSelect label="Visibility" action={updateAssignment} input={{ id: r.assignment_id }} field="status" value={r.publish_status} options={[["draft", "Draft"], ["published", "Published"]]} />
              <StatusBadge status={r.publish_status} />
              <ActionButton variant="ghost" size="icon" aria-label="Unassign" action={removeAssignment} input={{ id: r.assignment_id }} confirm="Unassign this lesson? Progress and submissions for it are deleted."><Trash2 /></ActionButton>
            </li>))}</ul>
        </Card>
      )}

      <LessonEditor key={l.updated_at} {...extra} teacherId={profile.id} initial={{
        id, title: l.title, subject_id: l.subject_id ?? "", objectives: l.objectives, introduction: l.introduction, instructions: l.instructions, materials: l.materials,
        duration_minutes: l.duration_minutes, expected_outcome: l.expected_outcome, completion_criteria: l.completion_criteria, notes: notes.data?.notes ?? "", is_template: l.is_template,
        resources: (res[id] ?? []).map(({ id: _i, ...r }) => r),
        activities: activities.map((a) => ({ id: a.id, title: a.title, description: a.description, instructions: a.instructions, estimated_minutes: a.estimated_minutes, expected_result: a.expected_result,
          requires_submission: a.requires_submission, requires_review: a.requires_review, resources: a.resources.map(({ id: _i, ...r }) => r) })),
      }} />
    </>
  );
}
