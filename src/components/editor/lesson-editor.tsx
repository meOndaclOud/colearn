"use client";
import * as React from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, CopyPlus, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/dialog";
import { RichText } from "./rich-text";
import { ResourceEditor } from "./resource-editor";
import { saveLesson } from "@/actions/lessons";
import { lessonSchema } from "@/lib/schemas";
import type { Activity, LibraryItem, Resource, Subject } from "@/lib/types";

export type LessonForm = {
  id?: string; title: string; subject_id: string | null; objectives: string; introduction: string; instructions: string; materials: string;
  duration_minutes: number; expected_outcome: string; completion_criteria: string; notes: string; is_template: boolean;
  resources: Resource[]; activities: (Activity & { activityId?: string })[];
};
export type CopySource = { lesson: string; activities: Activity[] };

const blankActivity = (): Activity => ({ title: "", description: "", instructions: "", estimated_minutes: 15, expected_result: "", requires_submission: false, requires_review: false, resources: [] });

export function LessonEditor({ initial, subjects, library, teacherId, copySources }: { initial: LessonForm; subjects: Subject[]; library: LibraryItem[]; teacherId: string; copySources: CopySource[] }) {
  const saved = React.useRef(false);
  const [rev, setRev] = React.useState(0);
  const { register, control, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm<LessonForm>({
    // the database id is kept as activityId so react-hook-form's own key cannot overwrite it
    defaultValues: { ...initial, activities: initial.activities.map(({ id, ...a }) => ({ ...a, activityId: id })) },
  });
  const { fields, append, remove, move } = useFieldArray({ control, name: "activities" });

  React.useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => { if (!saved.current) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const submit = handleSubmit(async (values) => {
    const parsed = lessonSchema.safeParse({ ...values, activities: values.activities.map(({ activityId, ...a }) => ({ ...a, id: activityId })) });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    const r = await saveLesson(parsed.data);
    if (r.error) { toast.error(r.error); return; }
    toast.success("Lesson saved");
    saved.current = true;
    reset(values);
    // reload so newly created activities receive their database ids
    window.location.assign(`/teacher/planner/lessons/${r.id}?saved=1`);
  });

  const area = (name: "objectives" | "materials" | "expected_outcome" | "completion_criteria", label: string, ph: string) => (
    <Field label={label}><Textarea placeholder={ph} {...register(name)} /></Field>
  );
  const rich = (name: "introduction" | "instructions" | `activities.${number}.instructions`, label: string) => (
    <div className="space-y-1.5"><span className="text-[13px] font-medium">{label}</span>
      <Controller control={control} name={name} render={({ field }) => <RichText key={rev} label={label} value={field.value} onChange={field.onChange} />} /></div>
  );
  const resources = (name: "resources" | `activities.${number}.resources`) => (
    <Controller control={control} name={name} render={({ field }) => <ResourceEditor value={field.value} onChange={field.onChange} teacherId={teacherId} library={library} />} />
  );

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Card className="space-y-4">
        <CardTitle>Lesson basics</CardTitle>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_8rem]">
          <Field label="Lesson title"><Input placeholder="e.g. Tell a story in Scratch" {...register("title")} /></Field>
          <Field label="Learning category" hint="Choose a subject from Settings."><Select {...register("subject_id")}><option value="">No category</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Minutes"><Input type="number" min={0} {...register("duration_minutes", { valueAsNumber: true })} /></Field>
        </div>
        {area("objectives", "Learning objectives", "What will the student be able to do?")}
        {rich("introduction", "Introduction / explanation")}
        {rich("instructions", "Specific instructions for students")}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Step-by-step activities</h2>
        {copySources.length > 0 && (
          <Modal title="Copy activities from another lesson" trigger={<Button variant="outline" size="sm"><CopyPlus />Copy from a lesson</Button>}>
            <ul className="max-h-96 space-y-3 overflow-y-auto">
              {copySources.map((s, i) => (
                <li key={i}><p className="mb-1 text-xs font-semibold text-muted">{s.lesson}</p>
                  {s.activities.map((a) => (
                    <button type="button" key={a.id} className="mb-1 flex w-full cursor-pointer items-center justify-between rounded-lg border border-line px-3 py-2 text-left text-sm hover:bg-brand-soft"
                      onClick={() => { const { id: _drop, ...copy } = a; append(structuredClone(copy)); toast.success(`Added “${a.title}”`); }}>{a.title}<Plus className="size-4" /></button>
                  ))}</li>
              ))}
            </ul>
          </Modal>
        )}
      </div>

      {fields.map((f, i) => (
        <Card key={f.id} className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle>Activity {i + 1}</CardTitle>
            <div className="flex">
              <Button variant="ghost" size="icon" aria-label="Move up" disabled={i === 0} onClick={() => { move(i, i - 1); setRev(rev + 1); }}><ArrowUp /></Button>
              <Button variant="ghost" size="icon" aria-label="Move down" disabled={i === fields.length - 1} onClick={() => { move(i, i + 1); setRev(rev + 1); }}><ArrowDown /></Button>
              <Button variant="ghost" size="icon" aria-label="Remove activity" onClick={() => { if (!f.activityId || confirm("Remove this activity? Saved progress for it will be deleted.")) { remove(i); setRev(rev + 1); } }}><Trash2 /></Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <Field label="Activity title"><Input {...register(`activities.${i}.title`)} /></Field>
            <Field label="Minutes"><Input type="number" min={0} {...register(`activities.${i}.estimated_minutes`, { valueAsNumber: true })} /></Field>
          </div>
          <Field label="Description"><Textarea {...register(`activities.${i}.description`)} /></Field>
          {rich(`activities.${i}.instructions`, "Instructions")}
          <Field label="Expected result"><Input {...register(`activities.${i}.expected_result`)} /></Field>
          <div className="space-y-1.5"><span className="text-[13px] font-medium">Resources, links and files</span>{resources(`activities.${i}.resources`)}</div>
          <div className="flex flex-wrap gap-5">
            <Checkbox label="Student must submit work" {...register(`activities.${i}.requires_submission`)} />
            <Checkbox label="I approve before it counts as completed" {...register(`activities.${i}.requires_review`)} />
          </div>
        </Card>
      ))}
      <Button variant="soft" className="w-full border border-dashed border-brand/30" onClick={() => append(blankActivity())}><Plus />Add activity</Button>

      <Card className="space-y-4">
        <CardTitle>Materials, outcome and notes</CardTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          {area("materials", "Required materials", "Laptop, mouse, paper…")}
          {area("expected_outcome", "Expected outcome", "What should be produced?")}
          {area("completion_criteria", "Completion criteria", "How do we know it is done?")}
        </div>
        <div className="space-y-1.5"><span className="text-[13px] font-medium">Reference links and attached documents</span>{resources("resources")}</div>
        <Field label="Teacher notes" hint="Private. Students never see these."><Textarea {...register("notes")} /></Field>
        <Checkbox label="Keep as a reusable template" {...register("is_template")} />
      </Card>

      <div className="glass sticky bottom-3 z-20 flex items-center justify-between gap-3 rounded-2xl p-3 shadow-lift">
        <span className="text-sm text-muted">{isDirty ? "Unsaved changes" : "All changes saved"}</span>
        <Button type="submit" loading={isSubmitting}><Save />Save lesson</Button>
      </div>
    </form>
  );
}
