import { Award, CheckCircle2, CircleDashed, ListTodo, Loader, Percent } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Stat, ProgressBar } from "./bits";
import { ActivityChart } from "@/components/charts/charts";
import { byDay, totals } from "@/lib/stats";
import { fmtDate, pct } from "@/lib/utils";
import type { Feedback, Progress } from "@/lib/types";

/** Progress report for one student over a date range. All numbers come from the rows passed in. */
export function Report({ rows, from, to, feedback, extra }: { rows: Progress[]; from: string; to: string; feedback: Feedback[]; extra?: { challengesDone: number; challengesTotal: number; submissions: number } }) {
  const t = totals(rows);
  const notes = feedback.filter((f) => f.kind === "observation");
  const wins = feedback.filter((f) => f.kind === "achievement");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Assigned activities" value={t.total} icon={ListTodo} />
        <Stat label="Completed" value={t.completed} icon={CheckCircle2} tone="bg-teal-soft text-teal" />
        <Stat label="In progress" value={t.inProgress} icon={Loader} />
        <Stat label="Pending" value={t.pending} icon={CircleDashed} tone="bg-warn-soft text-warn" />
        <Stat label="Completion rate" value={`${pct(t.completed, t.total)}%`} icon={Percent} tone="bg-teal-soft text-teal" />
      </div>
      {extra && <p className="text-sm text-muted">Challenges completed: <b className="text-ink">{extra.challengesDone} of {extra.challengesTotal}</b> · Submissions in this period: <b className="text-ink">{extra.submissions}</b></p>}
      <Card><CardTitle className="mb-3">Activities by day</CardTitle><ActivityChart data={byDay(rows, from, to)} /></Card>
      {rows.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs text-muted"><tr><th className="p-3">Date</th><th className="p-3">Lesson</th><th className="p-3">Activities</th><th className="w-40 p-3">Progress</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.assignment_id} className="border-t border-line"><td className="whitespace-nowrap p-3">{fmtDate(r.scheduled_date, "EEE d MMM")}</td><td className="p-3 font-medium">{r.title}</td>
                <td className="p-3">{r.completed}/{r.total}</td><td className="p-3"><ProgressBar value={pct(r.completed, r.total)} label={r.title} /></td></tr>
            ))}</tbody>
          </table>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardTitle className="mb-2">Teacher observations</CardTitle>
          {notes.length ? <ul className="space-y-2 text-sm">{notes.slice(0, 6).map((n) => <li key={n.id}>{n.body}<span className="ml-2 text-xs text-muted">{fmtDate(n.created_at, "d MMM")}</span></li>)}</ul> : <p className="text-sm text-muted">No observations yet.</p>}</Card>
        <Card><CardTitle className="mb-2">Recent achievements</CardTitle>
          {wins.length ? <ul className="space-y-2 text-sm">{wins.slice(0, 6).map((n) => <li key={n.id} className="flex gap-2"><Award className="size-4 shrink-0 text-warn" />{n.body}</li>)}</ul> : <p className="text-sm text-muted">No achievements recorded yet.</p>}</Card>
      </div>
    </div>
  );
}
