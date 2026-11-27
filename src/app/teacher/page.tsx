import Link from "next/link";
import { CalendarClock, CheckCircle2, CircleDashed, Loader, Plus, Users, BarChart3, Inbox, Activity, Sparkles } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { must } from "@/lib/data";
import { avatarsFor, getStudents, getSubjects, lessonOptions, options } from "@/lib/queries";
import { totals } from "@/lib/stats";
import { fmtDate, fmtDateTime, pct, shiftDate } from "@/lib/utils";
import { STATUS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Avatar, Badge, Empty, PageHeader, ProgressBar, Stat, StatusBadge } from "@/components/shared/bits";
import { ScheduleDialog } from "@/components/teacher/schedule-dialog";
import { AssignChallengeDialog, StudentDialog } from "@/components/teacher/forms";
import type { Progress, Submission } from "@/lib/types";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const { db, profile, today } = await requireTeacher();
  const [students, subjects, lessons] = await Promise.all([getStudents(db), getSubjects(db), lessonOptions(db)]);
  const active = students.filter((s) => s.is_active);
  const [todayRes, upcomingRes, subsRes, histRes, links, challenges, avatars] = await Promise.all([
    db.from("assignment_progress").select("*").eq("scheduled_date", today).eq("publish_status", "published"),
    db.from("assignment_progress").select("*").gt("scheduled_date", today).lte("scheduled_date", shiftDate(today, 14)).order("scheduled_date").limit(8),
    db.from("submissions").select("*").order("created_at", { ascending: false }).limit(5),
    db.from("progress_history").select("*").order("created_at", { ascending: false }).limit(200),
    db.from("student_subjects").select("student_id, subject_id"),
    db.from("challenges").select("id, title").order("title"),
    avatarsFor(db, students),
  ]);
  const todays = must<Progress[]>(todayRes), upcoming = must<Progress[]>(upcomingRes), subs = must<Submission[]>(subsRes);
  const history = must<{ id: string; student_id: string; title: string; status: string; by_teacher: boolean; created_at: string }[]>(histRes);
  const subj = must<{ student_id: string; subject_id: string }[]>(links);
  const t = totals(todays);
  const name = (id: string) => students.find((s) => s.id === id)?.full_name ?? "Student";
  const studentActivity = history.filter((h) => !h.by_teacher).slice(0, 6);

  return (
    <>
      <PageHeader title="Classroom overview" subtitle={fmtDate(today, "EEEE d MMMM yyyy")}>
        <StudentDialog subjects={subjects} teacherId={profile.id} />
        <Button asChild variant="outline"><Link href="/teacher/planner/lessons/new"><Plus />Create lesson</Link></Button>
        <ScheduleDialog lessons={lessons} students={options(students)} today={today} variant="outline" label="Schedule lesson" />
        <AssignChallengeDialog challenges={must<{ id: string; title: string }[]>(challenges).map((c) => ({ id: c.id, name: c.title }))} students={options(students)} variant="outline" />
        <Button asChild variant="outline"><Link href="/teacher/reports"><BarChart3 />View progress</Link></Button>
      </PageHeader>

      <section className="surface-grid relative mb-5 overflow-hidden rounded-xl bg-[#14253a] px-5 py-6 text-white sm:px-7 sm:py-7">
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-xl">
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.15em] text-[#b2c2ff]"><Sparkles className="size-3.5" />Teacher workspace</p>
            <h2 className="text-[25px] font-semibold tracking-[-0.04em] sm:text-[29px]">Welcome back, {profile.full_name.split(" ")[0] || "there"}.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{active.length ? `${active.length} active ${active.length === 1 ? "student" : "students"} in your classroom.` : "Add your first student to start planning learning together."} {todays.length ? `${todays.length} lesson ${todays.length === 1 ? "is" : "are"} on today's plan.` : "Your daily overview will take shape as you schedule lessons."}</p>
          </div>
          <div className="flex gap-2.5">
            <div className="min-w-24 rounded-lg border border-white/10 bg-white/[.06] px-3.5 py-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Students</p><p className="mt-1 text-2xl font-semibold tracking-tight">{active.length}</p></div>
            <div className="min-w-24 rounded-lg border border-white/10 bg-white/[.06] px-3.5 py-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Today</p><p className="mt-1 text-2xl font-semibold tracking-tight">{t.completed}<span className="text-sm font-medium text-slate-400">/{t.total}</span></p></div>
          </div>
        </div>
        <div aria-hidden className="absolute -right-12 -top-28 size-64 rounded-full border border-white/[.08]" />
        <div aria-hidden className="absolute -right-3 -top-20 size-44 rounded-full border border-white/[.08]" />
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Active students" value={active.length} icon={Users} href="/teacher/students" />
        <Stat label="Lessons today" value={todays.length} icon={CalendarClock} href="/teacher/planner?view=day" />
        <Stat label="Activities completed today" value={t.completed} icon={CheckCircle2} tone="bg-teal-soft text-teal" />
        <Stat label="In progress today" value={t.inProgress} icon={Loader} />
        <Stat label="Pending today" value={t.pending} icon={CircleDashed} tone="bg-warn-soft text-warn" />
      </div>

      <h2 className="mb-3 mt-8 text-[16px] font-semibold tracking-tight">Students today</h2>
      {!active.length ? <Empty icon={Users} title="No students yet">Add your first student to start planning.</Empty> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {active.map((s) => {
            const mine = totals(todays.filter((r) => r.student_id === s.id));
            const state = !mine.total ? null : mine.completed === mine.total ? "completed" : mine.completed + mine.inProgress ? "in_progress" : "not_started";
            const last = history.find((h) => h.student_id === s.id && !h.by_teacher)?.created_at;
            return (
              <Link key={s.id} href={`/teacher/students/${s.id}`}>
                <Card className="h-full transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand/20 hover:shadow-lift">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.full_name} color={s.avatar_color} src={s.avatar_path ? avatars[s.avatar_path] : undefined} />
                    <div className="min-w-0 flex-1"><p className="truncate font-semibold">{s.full_name}</p>
                      <p className="truncate text-xs text-muted">{subj.filter((x) => x.student_id === s.id).map((x) => subjects.find((y) => y.id === x.subject_id)?.name).join(" · ") || "No subjects yet"}</p></div>
                    {state ? <StatusBadge status={state} /> : <Badge>No lesson</Badge>}
                  </div>
                  <div className="mt-4 flex items-center gap-3"><ProgressBar value={pct(mine.completed, mine.total)} /><span className="text-sm font-semibold">{pct(mine.completed, mine.total)}%</span></div>
                  <p className="mt-2 text-xs text-muted">Last activity: {last ? fmtDateTime(last, profile.timezone) : "none yet"}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        <Card><CardTitle className="mb-3">Upcoming lessons</CardTitle>
          {upcoming.length ? <ul className="space-y-2.5 text-sm">{upcoming.map((u) => (
            <li key={u.assignment_id}><Link href={`/teacher/planner/lessons/${u.lesson_id}`} className="flex justify-between gap-2 hover:text-brand">
              <span className="min-w-0"><span className="block truncate font-medium">{u.title}</span><span className="text-xs text-muted">{name(u.student_id)} · {fmtDate(u.scheduled_date, "EEE d MMM")}</span></span>
              {u.publish_status === "draft" && <StatusBadge status="draft" />}</Link></li>))}</ul>
            : <Empty icon={CalendarClock} title="Nothing scheduled ahead">Use Schedule lesson to prepare the week.</Empty>}
        </Card>
        <Card><CardTitle className="mb-3">Recent submissions</CardTitle>
          {subs.length ? <ul className="space-y-2.5 text-sm">{subs.map((s) => (
            <li key={s.id}><Link href="/teacher/submissions" className="flex justify-between gap-2 hover:text-brand">
              <span className="min-w-0"><span className="block truncate font-medium">{s.title}</span><span className="text-xs text-muted">{name(s.student_id)} · {fmtDateTime(s.created_at, profile.timezone)}</span></span><StatusBadge status={s.status} /></Link></li>))}</ul>
            : <Empty icon={Inbox} title="No submissions yet" />}
        </Card>
        <Card><CardTitle className="mb-3">Recent student activity</CardTitle>
          {studentActivity.length ? <ul className="space-y-2.5 text-sm">{studentActivity.map((h) => (
            <li key={h.id}><b className="font-medium">{name(h.student_id)}</b>: {h.title} <span className="text-muted">→ {STATUS[h.status]?.label.toLowerCase()}</span><span className="block text-xs text-muted">{fmtDateTime(h.created_at, profile.timezone)}</span></li>))}</ul>
            : <Empty icon={Activity} title="No activity yet" />}
        </Card>
      </div>
    </>
  );
}
