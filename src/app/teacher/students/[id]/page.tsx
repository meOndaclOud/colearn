import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, FolderCheck, History, Trash2, Trophy } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { must } from "@/lib/data";
import { avatarsFor, getStudents, getSubjects, lessonOptions } from "@/lib/queries";
import { lessonState, weekStart } from "@/lib/stats";
import { fmtDate, fmtDateTime, pct, shiftDate } from "@/lib/utils";
import { STATUS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Avatar, Badge, Detail, Empty, PageHeader, ProgressBar, StatusBadge, Tabs } from "@/components/shared/bits";
import { ActionButton, QuickSelect } from "@/components/shared/action-button";
import { Report } from "@/components/shared/report";
import { SubmissionCard } from "@/components/shared/submission-card";
import { ScheduleDialog } from "@/components/teacher/schedule-dialog";
import { AssignChallengeDialog, FeedbackForm, ReviewForm, StudentDialog } from "@/components/teacher/forms";
import { setStudentActive, deleteStudent, deleteFeedback } from "@/actions/students";
import { updateChallengeAssignment, removeChallengeAssignment } from "@/actions/content";
import type { ChallengeAssignment, Feedback, Progress, Submission } from "@/lib/types";

const TABS = ["overview", "lessons", "challenges", "projects", "progress", "history"];

export default async function StudentProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const tab = (await searchParams).tab ?? "overview";
  const { db, profile, today } = await requireTeacher();
  const [students, subjects] = await Promise.all([getStudents(db), getSubjects(db)]);
  const s = students.find((x) => x.id === id);
  if (!s) notFound();
  const [notesRes, linkRes, progRes, chRes, subRes, fbRes, histRes, lessons, allCh, avatars] = await Promise.all([
    db.from("student_notes").select("notes").eq("student_id", id).maybeSingle(),
    db.from("student_subjects").select("subject_id").eq("student_id", id),
    db.from("assignment_progress").select("*").eq("student_id", id).order("scheduled_date", { ascending: false }).limit(200),
    db.from("challenge_assignments").select("*, challenges(title, category)").eq("student_id", id).order("created_at", { ascending: false }),
    db.from("submissions").select("*").eq("student_id", id).order("created_at", { ascending: false }),
    db.from("teacher_feedback").select("*").eq("student_id", id).order("created_at", { ascending: false }),
    db.from("progress_history").select("*").eq("student_id", id).order("created_at", { ascending: false }).limit(100),
    lessonOptions(db),
    db.from("challenges").select("id, title").order("title"),
    avatarsFor(db, [s]),
  ]);
  const notes: string = notesRes.data?.notes ?? "";
  const subjectIds = must<{ subject_id: string }[]>(linkRes).map((x) => x.subject_id);
  const progress = must<Progress[]>(progRes), subs = must<Submission[]>(subRes), feedback = must<Feedback[]>(fbRes);
  const challenges = must<(ChallengeAssignment & { challenges: { title: string; category: string } })[]>(chRes);
  const history = must<{ id: string; title: string; status: string; by_teacher: boolean; created_at: string }[]>(histRes);
  const me = [{ id: s.id, name: s.full_name }];
  const from = weekStart(today), to = shiftDate(from, 6);

  return (
    <>
      <PageHeader back={{ href: "/teacher/students", label: "Students" }}
        title={s.full_name}
        subtitle={<span className="flex items-center gap-3"><Avatar name={s.full_name} color={s.avatar_color} src={s.avatar_path ? avatars[s.avatar_path] : undefined} />@{s.username}{s.grade ? ` · ${s.grade}` : ""}{!s.is_active && <Badge tone="red">Deactivated</Badge>}</span>}>
        <StudentDialog student={s} notes={notes} subjectIds={subjectIds} subjects={subjects} teacherId={profile.id} />
        <ActionButton variant="outline" action={setStudentActive} input={{ id, active: !s.is_active }} success={s.is_active ? "Student deactivated" : "Student reactivated"}
          confirm={s.is_active ? "This student will disappear from the class sign-in list. Their records are kept." : undefined}>{s.is_active ? "Deactivate" : "Reactivate"}</ActionButton>
        <ActionButton variant="danger" action={deleteStudent} input={{ id }} redirectTo="/teacher/students" success="Student deleted" confirm={`Permanently delete ${s.full_name} and all their lessons progress, submissions and feedback?`}><Trash2 />Delete</ActionButton>
      </PageHeader>
      <Tabs active={tab} items={TABS.map((k) => ({ key: k, label: k === "history" ? "Learning History" : k[0].toUpperCase() + k.slice(1), href: `/teacher/students/${id}?tab=${k}` }))} />

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-4">
            <Detail label="Age">{s.age?.toString()}</Detail>
            <Detail label="Subjects">{subjectIds.map((x) => subjects.find((y) => y.id === x)?.name).join(", ")}</Detail>
            <Detail label="Learning interests">{s.interests.join(", ")}</Detail>
            <Detail label="Teacher notes (private)">{notes}</Detail>
            <Detail label="Account">{s.is_active ? "Active — appears in the class sign-in list" : "Deactivated"}</Detail>
          </Card>
          <Card><CardTitle className="mb-3">Feedback and observations</CardTitle>
            <FeedbackForm studentId={id} />
            <ul className="mt-4 space-y-3">{feedback.slice(0, 10).map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-2 text-sm"><div><Badge tone={f.kind === "observation" ? "grey" : f.kind === "achievement" ? "amber" : "teal"}>{f.kind}</Badge> {f.body}<span className="block text-xs text-muted">{fmtDateTime(f.created_at, profile.timezone)}</span></div>
                <ActionButton variant="ghost" size="icon" aria-label="Delete note" action={deleteFeedback} input={{ id: f.id }} confirm="Delete this note?"><Trash2 /></ActionButton></li>))}</ul>
          </Card>
        </div>
      )}

      {tab === "lessons" && (
        <div className="space-y-3">
          {s.is_active && <ScheduleDialog lessons={lessons} students={me} studentId={id} today={today} label="Assign a lesson" customAssignment />}
          {!progress.length && <Empty icon={CalendarDays} title="No lessons assigned yet" />}
          {progress.map((r) => (
            <Link key={r.assignment_id} href={`/teacher/students/${id}/lessons/${r.assignment_id}`} className="block">
              <Card className="flex flex-wrap items-center gap-3 p-4 transition hover:shadow-lift">
                <div className="min-w-48 flex-1"><p className="font-medium">{r.title}</p><p className="text-xs text-muted">{fmtDate(r.scheduled_date, "EEEE d MMM yyyy")} · {r.activity_total ? `${r.completed}/${r.total} activities` : r.lesson_status === "completed" ? "Instruction-only lesson completed" : "Instruction-only lesson"}</p></div>
                <div className="w-32"><ProgressBar value={pct(r.completed, r.total)} /></div>
                <StatusBadge status={r.publish_status === "draft" ? "draft" : lessonState(r)} />
              </Card>
            </Link>))}
        </div>
      )}

      {tab === "challenges" && (
        <div className="space-y-3">
          {s.is_active && <AssignChallengeDialog challenges={must<{ id: string; title: string }[]>(allCh).map((c) => ({ id: c.id, name: c.title }))} students={me} studentId={id} />}
          {!challenges.length && <Empty icon={Trophy} title="No challenges assigned" />}
          {challenges.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <Link href={`/teacher/challenges/${c.challenge_id}`} className="hover:text-brand"><p className="font-medium">{c.challenges.title}</p><p className="text-xs text-muted">{c.challenges.category} · {c.deadline ? `Due ${fmtDate(c.deadline)}` : "No deadline"}</p></Link>
              <div className="flex items-center gap-2">
                <QuickSelect label="Challenge status" action={updateChallengeAssignment} input={{ id: c.id }} field="status" value={c.status} options={["not_started", "in_progress", "submitted", "completed"].map((k) => [k, STATUS[k].label])} />
                <ActionButton variant="ghost" size="icon" aria-label="Remove challenge" action={removeChallengeAssignment} input={{ id: c.id }} confirm="Remove this challenge and its submissions for this student?"><Trash2 /></ActionButton>
              </div>
            </Card>))}
        </div>
      )}

      {tab === "projects" && (
        <div className="space-y-3">
          {!subs.length && <Empty icon={FolderCheck} title="Nothing submitted yet" />}
          {subs.map((x) => <SubmissionCard key={x.id} s={x} timezone={profile.timezone} feedback={feedback}>{x.status === "submitted" && <ReviewForm id={x.id} />}</SubmissionCard>)}
        </div>
      )}

      {tab === "progress" && (
        <>
          <p className="mb-3 text-sm text-muted">This week ({fmtDate(from, "d MMM")} – {fmtDate(to, "d MMM")}). <Link className="text-brand underline" href={`/teacher/reports?student=${id}&period=month`}>Open full reports</Link></p>
          <Report rows={progress.filter((r) => r.publish_status === "published" && r.scheduled_date >= from && r.scheduled_date <= to).reverse()} from={from} to={to} feedback={feedback} />
        </>
      )}

      {tab === "history" && (history.length ? (
        <Card><ol className="space-y-4 border-l border-line pl-4">{history.map((h) => (
          <li key={h.id} className="relative text-sm"><span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-brand" />
            <b className="font-medium">{h.title}</b> — {STATUS[h.status]?.label}<span className="block text-xs text-muted">{fmtDateTime(h.created_at, profile.timezone)} · by {h.by_teacher ? "teacher" : "student"}</span></li>))}</ol></Card>
      ) : <Empty icon={History} title="No history yet">Every status change is recorded here.</Empty>)}
    </>
  );
}
