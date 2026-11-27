import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { must } from "@/lib/data";
import { getStudents } from "@/lib/queries";
import { totals, weekStart } from "@/lib/stats";
import { fmtDate, pct, shiftDate, todayIn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Empty, PageHeader, ProgressBar, Tabs } from "@/components/shared/bits";
import { Report } from "@/components/shared/report";
import { PrintButton } from "@/components/shared/print-button";
import { StudentFilter } from "@/components/teacher/student-filter";
import type { ChallengeAssignment, Feedback, Progress, Submission } from "@/lib/types";

export const metadata = { title: "Progress & Reports" };

export default async function Reports({ searchParams }: { searchParams: Promise<{ period?: string; student?: string }> }) {
  const q = await searchParams;
  const period = q.period === "day" || q.period === "month" ? q.period : "week";
  const { db, profile, today } = await requireTeacher();
  const students = (await getStudents(db)).filter((s) => s.is_active);
  const student = students.find((s) => s.id === q.student);
  const monthEnd = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const from = period === "day" ? today : period === "week" ? weekStart(today) : today.slice(0, 8) + "01";
  const to = period === "day" ? today : period === "week" ? shiftDate(from, 6) : monthEnd;
  const [pr, ch, sub, fb] = await Promise.all([
    db.from("assignment_progress").select("*").eq("publish_status", "published").gte("scheduled_date", from).lte("scheduled_date", to).order("scheduled_date").limit(1000),
    db.from("challenge_assignments").select("*"),
    db.from("submissions").select("id, student_id, created_at").gte("created_at", shiftDate(from, -1)),
    db.from("teacher_feedback").select("*").order("created_at", { ascending: false }),
  ]);
  const rows = must<Progress[]>(pr), challenges = must<ChallengeAssignment[]>(ch), feedback = must<Feedback[]>(fb);
  const subs = must<Submission[]>(sub).filter((s) => { const d = todayIn(profile.timezone, new Date(s.created_at)); return d >= from && d <= to; });
  const link = (o: Record<string, string>) => `/teacher/reports?${new URLSearchParams({ period, ...(student && { student: student.id }), ...o })}`;
  const stats = (sid: string) => ({
    t: totals(rows.filter((r) => r.student_id === sid)),
    done: challenges.filter((c) => c.student_id === sid && c.status === "completed").length,
    all: challenges.filter((c) => c.student_id === sid).length,
    subs: subs.filter((s) => s.student_id === sid).length,
  });
  const range = period === "day" ? fmtDate(from) : `${fmtDate(from, "d MMM")} – ${fmtDate(to)}`;

  return (
    <>
      <PageHeader title={student ? `Progress report: ${student.full_name}` : "Progress & Reports"} subtitle={range}>
        <StudentFilter students={students.map((s) => ({ id: s.id, name: s.full_name }))} value={student?.id ?? ""} allLabel="Whole class" />
        {student && <PrintButton />}
      </PageHeader>
      <Tabs active={period} items={[["day", "Daily"], ["week", "Weekly"], ["month", "Monthly"]].map(([key, label]) => ({ key, label, href: link({ period: key }) }))} />
      {student ? (
        <Report rows={rows.filter((r) => r.student_id === student.id)} from={from} to={to} feedback={feedback.filter((f) => f.student_id === student.id)}
          extra={{ challengesDone: stats(student.id).done, challengesTotal: stats(student.id).all, submissions: stats(student.id).subs }} />
      ) : students.length ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-muted"><tr>{["Student", "Assigned", "Completed", "In progress", "Pending", "Completion", "Challenges", "Submissions"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
            <tbody>{students.map((s) => { const x = stats(s.id); return (
              <tr key={s.id} className="border-t border-line hover:bg-brand-soft/50">
                <td className="p-3 font-medium"><Link href={link({ student: s.id })} className="text-brand hover:underline">{s.full_name}</Link></td>
                <td className="p-3">{x.t.total}</td><td className="p-3">{x.t.completed}</td><td className="p-3">{x.t.inProgress}</td><td className="p-3">{x.t.pending}</td>
                <td className="p-3"><div className="flex w-32 items-center gap-2"><ProgressBar value={pct(x.t.completed, x.t.total)} /><span>{pct(x.t.completed, x.t.total)}%</span></div></td>
                <td className="p-3">{x.done}/{x.all}</td><td className="p-3">{x.subs}</td>
              </tr>); })}</tbody>
          </table>
        </Card>
      ) : <Empty icon={BarChart3} title="No students to report on" />}
    </>
  );
}
