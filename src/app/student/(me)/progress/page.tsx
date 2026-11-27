import Link from "next/link";
import { BookCheck, FolderCheck, History, Trophy, PlayCircle } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { must } from "@/lib/data";
import { byDay, totals, weekStart } from "@/lib/stats";
import { fmtDate, fmtDateTime, pct, shiftDate } from "@/lib/utils";
import { STATUS } from "@/lib/constants";
import { Card, CardTitle } from "@/components/ui/card";
import { Empty, PageHeader, ProgressBar, Stat } from "@/components/shared/bits";
import { ActivityChart } from "@/components/charts/charts";
import type { Feedback, Progress } from "@/lib/types";

export const metadata = { title: "My Progress" };

export default async function MyProgress() {
  const { db, student, today, timezone } = await requireStudent();
  const [pr, ch, sub, fb, hr] = await Promise.all([
    db.from("assignment_progress").select("*").eq("student_id", student.id).lte("scheduled_date", today).order("scheduled_date", { ascending: false }).limit(300),
    db.from("challenge_assignments").select("status").eq("student_id", student.id),
    db.from("submissions").select("id").eq("student_id", student.id),
    db.from("teacher_feedback").select("*").eq("student_id", student.id).order("created_at", { ascending: false }).limit(10),
    db.from("progress_history").select("*").eq("student_id", student.id).order("created_at", { ascending: false }).limit(30),
  ]);
  const rows = must<Progress[]>(pr), challenges = must<{ status: string }[]>(ch), feedback = must<Feedback[]>(fb);
  const history = must<{ id: string; title: string; status: string; created_at: string }[]>(hr);
  const from = weekStart(today), to = shiftDate(from, 6);
  const day = totals(rows.filter((r) => r.scheduled_date === today));
  const week = totals(rows.filter((r) => r.scheduled_date >= from));
  const meter = (label: string, t: typeof day) => (
    <div><div className="mb-1 flex justify-between text-sm"><span>{label}</span><b>{t.total ? `${t.completed}/${t.total} · ${pct(t.completed, t.total)}%` : "Nothing assigned"}</b></div><ProgressBar value={pct(t.completed, t.total)} label={label} /></div>
  );
  return (
    <>
      <PageHeader title="My progress" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Lessons completed" value={rows.filter((r) => r.lesson_status === "completed").length} icon={BookCheck} tone="bg-teal-soft text-teal" />
        <Stat label="Lessons started" value={rows.filter((r) => r.started_at).length} icon={PlayCircle} />
        <Stat label="Challenges completed" value={challenges.filter((c) => c.status === "completed").length} icon={Trophy} />
        <Stat label="Work submitted" value={must<unknown[]>(sub).length} icon={FolderCheck} />
      </div>
      <Card className="mt-4 space-y-4">{meter("Today", day)}{meter("This week", week)}</Card>
      <Card className="mt-4"><CardTitle className="mb-3">This week by day</CardTitle><ActivityChart data={byDay(rows, from, to)} /></Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card><CardTitle className="mb-3">Learning history</CardTitle>
          {rows.length ? <ul className="max-h-80 space-y-2 overflow-y-auto">{rows.map((r) => (
            <li key={r.assignment_id}><Link href={`/student/lessons/${r.assignment_id}`} className="flex justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-brand-soft">
              <span><b className="font-medium">{r.title}</b><span className="ml-2 text-xs text-muted">{fmtDate(r.scheduled_date, "d MMM")}</span></span><span className="text-muted">{r.completed}/{r.total}</span></Link></li>))}</ul>
            : <Empty icon={History} title="No lessons yet" />}</Card>
        <Card><CardTitle className="mb-3">Activity timeline</CardTitle>
          {history.length ? <ol className="max-h-80 space-y-3 overflow-y-auto border-l border-line pl-4">{history.map((h) => (
            <li key={h.id} className="text-sm"><b className="font-medium">{h.title}</b> — {STATUS[h.status]?.label}<span className="block text-xs text-muted">{fmtDateTime(h.created_at, timezone)}</span></li>))}</ol>
            : <Empty icon={History} title="Nothing yet" />}</Card>
      </div>
      {feedback.length > 0 && <Card className="mt-4"><CardTitle className="mb-3">Teacher feedback</CardTitle><ul className="space-y-2">{feedback.map((f) => <li key={f.id} className="rounded-xl bg-teal-soft p-3 text-sm">{f.body}<span className="block text-xs text-muted">{fmtDateTime(f.created_at, timezone)}</span></li>)}</ul></Card>}
    </>
  );
}
