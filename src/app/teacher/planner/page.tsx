import Link from "next/link";
import { BookCopy, ChevronLeft, ChevronRight, Copy, Plus, Trash2, CalendarDays, Send } from "lucide-react";
import { addMonths, format, parseISO } from "date-fns";
import { requireTeacher } from "@/lib/auth";
import { must } from "@/lib/data";
import { getStudents, getSubjects, lessonOptions, options } from "@/lib/queries";
import { weekStart } from "@/lib/stats";
import { cn, fmtDate, shiftDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, Empty, PageHeader, StatusBadge, Tabs } from "@/components/shared/bits";
import { SearchList } from "@/components/shared/search-list";
import { ActionButton } from "@/components/shared/action-button";
import { ScheduleDialog } from "@/components/teacher/schedule-dialog";
import { StudentFilter } from "@/components/teacher/student-filter";
import { duplicateLesson, publishRange, removeAssignment, updateAssignment } from "@/actions/lessons";
import type { Lesson, Progress } from "@/lib/types";

export const metadata = { title: "Lesson Planner" };

type Q = { view?: string; date?: string; student?: string };

export default async function Planner({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const view = ["day", "week", "month", "lessons", "templates"].includes(q.view ?? "") ? q.view! : "week";
  const { db, today } = await requireTeacher();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(q.date ?? "") && !Number.isNaN(Date.parse(q.date!)) ? q.date! : today;
  const [students, subjects, lessons] = await Promise.all([getStudents(db), getSubjects(db), lessonOptions(db)]);
  const studentId = students.some((s) => s.id === q.student) ? q.student! : "";
  const href = (o: Q) => `/teacher/planner?${new URLSearchParams({ view, date, ...(studentId && { student: studentId }), ...o })}`;
  const isCalendar = view === "day" || view === "week" || view === "month";

  const header = (
    <>
      <PageHeader title="Lesson Planner" subtitle="Prepare lessons ahead. Published lessons appear to students on their date.">
        <Button asChild><Link href="/teacher/planner/lessons/new"><Plus />New lesson</Link></Button>
        <ScheduleDialog lessons={lessons} students={options(students)} today={today} studentId={studentId || undefined} variant="outline" />
      </PageHeader>
      <Tabs active={view} items={[["day", "Day"], ["week", "Week"], ["month", "Month"], ["lessons", "All lessons"], ["templates", "Templates"]].map(([key, label]) => ({ key, label, href: href({ view: key }) }))} />
    </>
  );

  if (!isCalendar) {
    const rows = must<(Lesson & { activities: { count: number }[] })[]>(await db.from("lessons").select("*, activities(count)").eq("is_template", view === "templates").order("updated_at", { ascending: false }));
    return (
      <>
        {header}
        {!rows.length ? <Empty icon={BookCopy} title={view === "templates" ? "No templates yet" : "No lessons yet"}>{view === "templates" ? "Open a lesson and choose Save as template." : "Create your first lesson."}</Empty> : (
          <SearchList placeholder="Search lessons" filter={{ label: "All subjects", options: subjects.map((s) => s.name) }} items={rows.map((l) => {
            const subject = subjects.find((s) => s.id === l.subject_id)?.name;
            return {
              key: l.id, text: `${l.title} ${subject ?? ""} ${l.objectives}`, tags: subject ? [subject] : [],
              node: (
                <Card className="flex h-full flex-col gap-3 transition hover:-translate-y-0.5 hover:shadow-lift">
                  <Link href={`/teacher/planner/lessons/${l.id}`} className="flex-1">
                    {subject && <Badge tone="blue">{subject}</Badge>}
                    <p className="mt-2 font-semibold">{l.title}</p>
                    <p className="mt-1 text-xs text-muted">{l.activities[0]?.count ?? 0} activities · {l.duration_minutes} min</p>
                  </Link>
                  <ActionButton variant="soft" size="sm" action={duplicateLesson} input={{ id: l.id, template: false }} redirectTo="/teacher/planner/lessons/:id" success={view === "templates" ? "Lesson created from template" : "Lesson duplicated"}>
                    <Copy />{view === "templates" ? "Use template" : "Duplicate"}</ActionButton>
                </Card>),
            };
          })} />
        )}
      </>
    );
  }

  const monthFirst = date.slice(0, 8) + "01";
  const from = view === "day" ? date : view === "week" ? weekStart(date) : weekStart(monthFirst);
  const count = view === "day" ? 1 : view === "week" ? 7 : 42;
  const days = Array.from({ length: count }, (_, i) => shiftDate(from, i));
  const to = days[days.length - 1];
  let query = db.from("assignment_progress").select("*").gte("scheduled_date", from).lte("scheduled_date", to).order("title");
  if (studentId) query = query.eq("student_id", studentId);
  const rows = must<Progress[]>(await query);
  const name = (id: string) => students.find((s) => s.id === id)?.full_name ?? "";
  const step = (n: number) => (view === "month" ? format(addMonths(parseISO(monthFirst), n), "yyyy-MM-dd") : shiftDate(date, n * (view === "week" ? 7 : 1)));
  const drafts = rows.filter((r) => r.publish_status === "draft").length;

  const chip = (r: Progress) => (
    <Link key={r.assignment_id} href={`/teacher/planner/lessons/${r.lesson_id}`} title={`${r.title} — ${name(r.student_id)}`}
      className={cn("block rounded-lg border px-2 py-1.5 text-xs transition hover:shadow-soft", r.publish_status === "draft" ? "border-dashed border-slate-300 bg-slate-50" : "border-brand/20 bg-brand-soft")}>
      <span className="block truncate font-medium">{r.title}</span><span className="block truncate text-muted">{name(r.student_id)}{r.publish_status === "draft" ? " · draft" : ` · ${r.completed}/${r.total}`}</span>
    </Link>
  );

  return (
    <>
      {header}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="icon"><Link aria-label="Previous" href={href({ date: step(-1) })}><ChevronLeft /></Link></Button>
        <Button asChild variant="outline" size="sm"><Link href={href({ date: today })}>Today</Link></Button>
        <Button asChild variant="outline" size="icon"><Link aria-label="Next" href={href({ date: step(1) })}><ChevronRight /></Link></Button>
        <p className="mr-auto font-semibold">{view === "day" ? fmtDate(date, "EEEE d MMMM yyyy") : view === "week" ? `${fmtDate(from, "d MMM")} – ${fmtDate(to, "d MMM yyyy")}` : fmtDate(date, "MMMM yyyy")}</p>
        <StudentFilter students={students.map((s) => ({ id: s.id, name: s.full_name }))} value={studentId} />
        {drafts > 0 && <ActionButton variant="teal" size="sm" action={publishRange} input={{ from, to, student_id: studentId || null }} success="Drafts published" confirm={`Publish all ${drafts} draft lesson(s) shown here?`}><Send />Publish {drafts} draft{drafts > 1 ? "s" : ""}</ActionButton>}
      </div>

      {view === "month" && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-soft">
          <div className="grid min-w-[720px] grid-cols-7">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="border-b border-line p-2 text-xs font-semibold text-muted">{d}</div>)}
            {days.map((d) => {
              const list = rows.filter((r) => r.scheduled_date === d);
              return (
                <div key={d} className={cn("min-h-24 space-y-1 border-b border-r border-line p-1.5", d.slice(0, 7) !== date.slice(0, 7) && "bg-slate-50/70 text-muted")}>
                  <Link href={href({ view: "day", date: d })} className={cn("inline-grid size-6 place-items-center rounded-full text-xs font-medium hover:bg-brand-soft", d === today && "bg-brand text-white hover:bg-brand")}>{Number(d.slice(8))}</Link>
                  {list.slice(0, 3).map(chip)}
                  {list.length > 3 && <Link href={href({ view: "day", date: d })} className="block text-xs text-brand">+{list.length - 3} more</Link>}
                </div>);
            })}
          </div>
        </div>
      )}

      {view === "week" && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((d) => (
            <div key={d} className={cn("space-y-1.5 rounded-2xl border bg-white p-2 shadow-soft", d === today ? "border-brand" : "border-line")}>
              <Link href={href({ view: "day", date: d })} className="block px-1 text-xs font-semibold hover:text-brand">{fmtDate(d, "EEE d MMM")}</Link>
              {rows.filter((r) => r.scheduled_date === d).map(chip)}
              <ScheduleDialog key={`${d}-${studentId}`} lessons={lessons} students={options(students)} today={today} date={d} studentId={studentId || undefined} variant="ghost" size="sm" label="Add" />
            </div>))}
        </div>
      )}

      {view === "day" && (
        <div className="space-y-2">
          <ScheduleDialog key={`${date}-${studentId}`} lessons={lessons} students={options(students)} today={today} date={date} studentId={studentId || undefined} variant="soft" label="Add lesson to this day" />
          {!rows.length && <Empty icon={CalendarDays} title="No lessons on this day" />}
          {rows.map((r) => (
            <Card key={r.assignment_id} className="flex flex-wrap items-center gap-3 p-4">
              <Link href={`/teacher/planner/lessons/${r.lesson_id}`} className="min-w-48 flex-1 hover:text-brand"><p className="font-medium">{r.title}</p><p className="text-xs text-muted">{name(r.student_id)} · {r.completed}/{r.total} activities done</p></Link>
              <StatusBadge status={r.publish_status} />
              <ActionButton variant="outline" size="sm" action={updateAssignment} input={{ id: r.assignment_id, status: r.publish_status === "draft" ? "published" : "draft" }} success="Updated">{r.publish_status === "draft" ? "Publish" : "Unpublish"}</ActionButton>
              <Button asChild variant="outline" size="sm"><Link href={`/teacher/students/${r.student_id}/lessons/${r.assignment_id}`}>Progress</Link></Button>
              <ActionButton variant="ghost" size="icon" aria-label="Remove from schedule" action={removeAssignment} input={{ id: r.assignment_id }} confirm="Remove this lesson from the student's schedule? Progress and submissions for it are deleted."><Trash2 /></ActionButton>
            </Card>))}
        </div>
      )}
    </>
  );
}
