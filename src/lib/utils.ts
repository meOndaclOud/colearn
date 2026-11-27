import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { addDays, format, parseISO } from "date-fns";

export const cn = (...i: ClassValue[]) => twMerge(clsx(i));
export const pct = (done: number, total: number) => (total ? Math.round((done / total) * 100) : 0);
export const fmtDate = (d?: string | null, f = "d MMM yyyy") => (d ? format(parseISO(d), f) : "—");
export const shiftDate = (d: string, n: number) => format(addDays(parseISO(d), n), "yyyy-MM-dd");
/** Today's date (yyyy-MM-dd) in a given timezone. */
export function todayIn(timeZone: string, at = new Date()) {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone }).format(at); }
  catch { return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(at); }
}
export const fmtDateTime = (iso: string | null | undefined, timeZone: string) =>
  iso ? new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "—";
export const initials = (n: string) => n.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
