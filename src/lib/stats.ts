import { fmtDate, shiftDate } from "./utils";
import type { Progress } from "./types";

export function totals(rows: Progress[]) {
  const t = rows.reduce((a, r) => ({ total: a.total + r.total, completed: a.completed + r.completed, inProgress: a.inProgress + r.in_progress }), { total: 0, completed: 0, inProgress: 0 });
  return { ...t, pending: t.total - t.completed - t.inProgress };
}
export const lessonState = (r: Progress) => r.lesson_status ?? (r.completed_at || (r.total > 0 && r.completed === r.total) ? "completed" : r.started_at || r.completed + r.in_progress ? "in_progress" : "not_started");

/** One bar per day between two dates. */
export function byDay(rows: Progress[], from: string, to: string) {
  const out: { label: string; Completed: number; Remaining: number }[] = [];
  for (let d = from; d <= to; d = shiftDate(d, 1)) {
    const t = totals(rows.filter((r) => r.scheduled_date === d));
    out.push({ label: fmtDate(d, "d MMM"), Completed: t.completed, Remaining: t.total - t.completed });
  }
  return out;
}
/** Monday of the week containing d. */
export const weekStart = (d: string) => shiftDate(d, -((new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7));
