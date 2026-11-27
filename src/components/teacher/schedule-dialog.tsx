"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { StudentPicker, type Opt } from "./pickers";
import { useAction } from "@/components/shared/action-button";
import { createAndScheduleLesson, scheduleLesson } from "@/actions/lessons";
import { fmtDate, shiftDate } from "@/lib/utils";
import { LEARNING_CATEGORIES } from "@/lib/constants";

/** Pick a lesson (or fixed lesson), students and one or many dates. */
export function ScheduleDialog({ lessons, students, today, lessonId, studentId, date, label = "Schedule", variant = "default", size, customAssignment = false }: {
  lessons: Opt[]; students: Opt[]; today: string; lessonId?: string; studentId?: string; date?: string; label?: React.ReactNode;
  variant?: React.ComponentProps<typeof Button>["variant"]; size?: React.ComponentProps<typeof Button>["size"];
  customAssignment?: boolean;
}) {
  const router = useRouter();
  const [lesson, setLesson] = React.useState(lessonId ?? "");
  const [mode, setMode] = React.useState<"custom" | "saved">(customAssignment ? "custom" : "saved");
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState("Scratch");
  const [instructions, setInstructions] = React.useState("");
  const [who, setWho] = React.useState<string[]>(studentId ? [studentId] : []);
  const [dates, setDates] = React.useState<string[]>([]);
  const [next, setNext] = React.useState(date ?? today);
  const [status, setStatus] = React.useState("published");
  const { pending, run } = useAction();
  const add = (list: string[]) => setDates((d) => [...new Set([...d, ...list])].sort());
  const weekdays = () => {
    const out: string[] = [];
    for (let d = next; out.length < 5; d = shiftDate(d, 1)) if (![0, 6].includes(new Date(d + "T00:00:00Z").getUTCDay())) out.push(d);
    add(out);
  };
  return (
    <Modal wide title="Schedule a lesson" description="Published lessons appear to students on their date."
      trigger={<Button variant={variant} size={size}><CalendarPlus />{label}</Button>}>
      {(close) => (
        <div className="space-y-5">
          {customAssignment && !lessonId && lessons.length > 0 && <div className="flex gap-2 rounded-xl bg-slate-50 p-1">
            <Button size="sm" variant={mode === "custom" ? "default" : "ghost"} onClick={() => setMode("custom")}>Write new assignment</Button>
            <Button size="sm" variant={mode === "saved" ? "default" : "ghost"} onClick={() => setMode("saved")}>Use saved lesson</Button>
          </div>}
          {customAssignment && mode === "custom" ? <section className="space-y-3">
            <div><h2 className="text-sm font-semibold">Lesson details</h2><p className="text-xs text-muted">Choose a learning platform and describe the task the student should complete.</p></div>
            <Field label="Lesson title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Storytelling project: add characters" /></Field>
            <Field label="Learning category" hint="This identifies the platform or subject."><Select value={category} onChange={(e) => setCategory(e.target.value)}>{LEARNING_CATEGORIES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Specific instructions" hint="These instructions will appear on the student's lesson page."><Textarea className="min-h-28" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Describe exactly what the student should do…" /></Field>
          </section> : !lessonId ? (
            <Field label="Saved lesson"><Select value={lesson} onChange={(e) => setLesson(e.target.value)}><option value="">Choose a lesson…</option>{lessons.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></Field>
          ) : null}
          <section className="space-y-3 border-t border-line pt-4"><div><h2 className="text-sm font-semibold">Assign to students</h2><p className="text-xs text-muted">Choose students and schedule one or more dates.</p></div>
          <StudentPicker students={students} value={who} onChange={setWho} />
          <div className="space-y-2">
            <Field label="Date"><Input type="date" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => next && add([next])}>Add another date</Button>
              <Button variant="outline" size="sm" onClick={() => next && weekdays()}>Add 5 weekdays from this date</Button>
            </div>
            {dates.length > 0 && <ul className="flex flex-wrap gap-1.5">{dates.map((d) => (
              <li key={d}><button type="button" aria-label={`Remove ${d}`} onClick={() => setDates(dates.filter((x) => x !== d))} className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-dark">{fmtDate(d, "EEE d MMM")}<X className="size-3" /></button></li>))}</ul>}
          </div>
          <Field label="Visibility"><Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="published">Published — visible on the date</option><option value="draft">Draft — hidden until you publish</option></Select></Field>
          </section>
          <div className="flex justify-end"><Button loading={pending} onClick={() => {
            const done = () => { setDates([]); close(); router.refresh(); };
            if (customAssignment && mode === "custom") {
              if (!title.trim()) { toast.error("Enter a lesson title."); return; }
              if (!instructions.trim()) { toast.error("Add specific instructions for the student."); return; }
              if (!who.length) { toast.error("Choose at least one student."); return; }
              run(createAndScheduleLesson, { title, category, instructions, student_ids: who, dates: dates.length ? dates : [next].filter(Boolean), status }, "Lesson assigned", done);
            } else {
              if (!lesson) { toast.error("Choose a saved lesson."); return; }
              if (!who.length) { toast.error("Choose at least one student."); return; }
              run(scheduleLesson, { lesson_id: lesson, student_ids: who, dates: dates.length ? dates : [next].filter(Boolean), status }, "Lesson scheduled", done);
            }
          }}>{mode === "custom" ? "Assign lesson" : "Save schedule"}</Button></div>
        </div>
      )}
    </Modal>
  );
}
