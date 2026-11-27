import Link from "next/link";
import { ArrowRight, BookOpen, Clock, ListChecks, MessageSquare, Sparkles, Trophy } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { must, signedAvatars } from "@/lib/data";
import { lessonState, totals } from "@/lib/stats";
import { fmtDate, fmtDateTime, pct } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Avatar, Badge, Empty, ProgressBar, StatusBadge } from "@/components/shared/bits";
import type { Feedback, Progress } from "@/lib/types";

export const metadata = { title: "Today" };

export default async function Today() {
  const { db, student, today, timezone } = await requireStudent();
  const [pr, ch, fb, subjects, avatars] = await Promise.all([
    db.from("assignment_progress").select("*").eq("student_id", student.id).lte("scheduled_date", today).order("scheduled_date", { ascending: false }).limit(60),
    db.from("challenge_assignments").select("id, status, deadline, challenges(title, category)").eq("student_id", student.id).neq("status", "completed").order("deadline", { nullsFirst: false }),
    db.from("teacher_feedback").select("*").eq("student_id", student.id).order("created_at", { ascending: false }).limit(4),
    db.from("subjects").select("id, name"),
    signedAvatars(db, [student.avatar_path]),
  ]);
  const all = must<Progress[]>(pr);
  const todays = all.filter((r) => r.scheduled_date === today);
  const unfinished = all.filter((r) => r.scheduled_date < today && r.completed < r.total).slice(0, 4);
  const intros = todays.length ? must<{ id: string; introduction: string; objectives: string }[]>(await db.from("lessons").select("id, introduction, objectives").in("id", todays.map((r) => r.lesson_id))) : [];
  const challenges = must<{ id: string; status: string; deadline: string | null; challenges: { title: string; category: string } }[]>(ch as never);
  const feedback = must<Feedback[]>(fb);
  const names = Object.fromEntries(must<{ id: string; name: string }[]>(subjects).map((s) => [s.id, s.name]));
  const t = totals(todays);
  const done = pct(t.completed, t.total);
  // first unfinished activity of today's lessons, in lesson order
  const open = todays.filter((r) => r.completed < r.total);
  let next: { title: string; lesson: string; href: string; minutes: number }[] = [];
  if (open.length) {
    const [acts, recs] = await Promise.all([
      db.from("activities").select("id, lesson_id, title, estimated_minutes, position").in("lesson_id", open.map((r) => r.lesson_id)).order("position"),
      db.from("progress_records").select("assignment_id, activity_id, status").in("assignment_id", open.map((r) => r.assignment_id)),
    ]);
    const done_ = new Set(must<{ assignment_id: string; activity_id: string; status: string }[]>(recs).filter((p) => p.status === "completed" || p.status === "awaiting_review").map((p) => p.assignment_id + p.activity_id));
    next = open.flatMap((r) => must<{ id: string; lesson_id: string; title: string; estimated_minutes: number }[]>(acts)
      .filter((x) => x.lesson_id === r.lesson_id && !done_.has(r.assignment_id + x.id))
      .map((x) => ({ title: x.title, lesson: r.title, minutes: x.estimated_minutes, href: `/student/lessons/${r.assignment_id}` }))).slice(0, 4);
  }
  const plain = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").trim();

  return (
    <>
      <section aria-label="Today's learning overview" className="surface-grid relative mb-7 overflow-hidden rounded-xl bg-[#14253a] p-5 text-white sm:p-7">
        <div className="relative z-10 flex flex-wrap items-center gap-4 sm:gap-5">
          <Avatar size="lg" name={student.full_name} color={student.avatar_color} src={student.avatar_path ? avatars[student.avatar_path] : undefined} />
          <div className="min-w-52 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#b2c2ff]">{fmtDate(today, "EEEE · d MMMM yyyy")}</p>
            <h1 className="mt-1.5 text-[25px] font-semibold tracking-[-0.04em] sm:text-[29px]">Hi, {student.full_name.split(" ")[0]}.</h1>
            <p className="mt-1 text-sm text-slate-300">{t.total ? "Here’s what you’re working on today." : "Your next learning steps will show up here."}</p>
          </div>
          <div className="w-full max-w-xs rounded-lg border border-white/10 bg-white/[.06] p-3.5 sm:w-64">
            <div className="mb-2.5 flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-200">Today&apos;s progress</span><span className="text-sm font-semibold tabular-nums">{t.completed}<span className="text-slate-400">/{t.total}</span></span></div>
            <ProgressBar value={done} label="Today's progress" />
            <p className="mt-2 text-[11px] text-slate-400">{t.total ? `${done}% complete` : "No lessons assigned for today"}</p>
          </div>
          {t.total > 0 && done === 100 && <Badge tone="teal" className="relative z-10"><Sparkles className="size-3.5" />All done today</Badge>}
        </div>
        <div aria-hidden className="absolute -right-14 -top-24 size-64 rounded-full border border-white/[.08]" />
        <div aria-hidden className="absolute -right-2 -top-16 size-40 rounded-full border border-white/[.08]" />
      </section>

      <h2 className="mb-3 text-lg font-semibold">Today&apos;s lessons</h2>
      {!todays.length ? <Empty icon={BookOpen} title="No lessons for today">Check your challenges, or finish earlier work.</Empty> : (
        <div className="grid gap-4 md:grid-cols-2">
          {todays.map((r) => {
            const l = intros.find((x) => x.id === r.lesson_id);
            const state = lessonState(r);
            return (
              <Card key={r.assignment_id} className="flex flex-col gap-3 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand/20 hover:shadow-lift">
                <div className="flex items-center justify-between gap-2">{r.subject_id ? <Badge tone="blue">{names[r.subject_id]}</Badge> : <span />}<StatusBadge status={state} /></div>
                <h3 className="text-lg font-semibold">{r.title}</h3>
                {l?.introduction && <p className="line-clamp-2 text-sm text-muted">{plain(l.introduction)}</p>}
                {l?.objectives && <p className="line-clamp-2 text-sm"><b>Goal:</b> {l.objectives}</p>}
                <p className="flex gap-4 text-xs text-muted"><span className="flex items-center gap-1"><Clock className="size-3.5" />{r.duration_minutes} min</span><span className="flex items-center gap-1"><ListChecks className="size-3.5" />{r.total} activities</span></p>
                <ProgressBar value={pct(r.completed, r.total)} />
                <Button asChild className="mt-auto"><Link href={`/student/lessons/${r.assignment_id}`}>{state === "not_started" ? "Start lesson" : state === "completed" ? "Review lesson" : "Continue"}<ArrowRight /></Link></Button>
              </Card>);
          })}
        </div>
      )}

      {next.length > 0 && (
        <><h2 className="mb-3 mt-7 text-lg font-semibold">Up next</h2>
          <ol className="space-y-2">{next.map((n, i) => (
            <li key={i}><Link href={n.href} className="block"><Card className="flex items-center justify-between gap-3 p-3 hover:border-brand">
              <span className="text-sm font-medium">{n.title}<span className="ml-2 text-xs font-normal text-muted">{n.lesson}</span></span><span className="whitespace-nowrap text-xs text-muted">{n.minutes} min</span></Card></Link></li>))}</ol></>
      )}

      {unfinished.length > 0 && (
        <><h2 className="mb-3 mt-7 text-lg font-semibold">Still to finish</h2>
          <div className="space-y-2">{unfinished.map((r) => (
            <Link key={r.assignment_id} href={`/student/lessons/${r.assignment_id}`} className="block"><Card className="flex items-center justify-between gap-3 p-3 hover:border-brand">
              <span className="text-sm font-medium">{r.title}<span className="ml-2 text-xs font-normal text-muted">{fmtDate(r.scheduled_date, "EEE d MMM")}</span></span><span className="text-xs text-muted">{r.completed}/{r.total}</span></Card></Link>))}</div></>
      )}

      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        <Card><CardTitle className="mb-3">Active challenges</CardTitle>
          {challenges.length ? <ul className="space-y-2">{challenges.slice(0, 5).map((c) => (
            <li key={c.id}><Link href={`/student/challenges/${c.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-line p-3 hover:border-brand">
              <span className="text-sm"><span className="block font-medium">{c.challenges.title}</span><span className="text-xs text-muted">{c.deadline ? `Due ${fmtDate(c.deadline, "EEE d MMM")}${c.deadline < today ? " (overdue)" : ""}` : c.challenges.category}</span></span><StatusBadge status={c.status} /></Link></li>))}</ul>
            : <Empty icon={Trophy} title="No open challenges" />}
        </Card>
        <Card><CardTitle className="mb-3">From your teacher</CardTitle>
          {feedback.length ? <ul className="space-y-2">{feedback.map((f) => (
            <li key={f.id} className="rounded-xl bg-teal-soft p-3 text-sm">{f.kind === "achievement" && <Badge tone="amber" className="mr-2">Achievement</Badge>}{f.body}<span className="mt-1 block text-xs text-muted">{fmtDateTime(f.created_at, timezone)}</span></li>))}</ul>
            : <Empty icon={MessageSquare} title="No feedback yet" />}
        </Card>
      </div>
    </>
  );
}
