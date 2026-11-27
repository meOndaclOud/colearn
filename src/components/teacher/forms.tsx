"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";
import { Pencil, Plus, UserPlus, Send } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { ResourceEditor, UploadButton } from "@/components/editor/resource-editor";
import { RichText } from "@/components/editor/rich-text";
import { StudentPicker, type Opt } from "./pickers";
import { useAction } from "@/components/shared/action-button";
import { saveStudent, addFeedback } from "@/actions/students";
import { saveChallenge, assignChallenge, createAndAssignChallenge, saveProject, saveLibraryItem, reviewSubmission } from "@/actions/content";
import { studentSchema, challengeSchema, projectSchema, librarySchema } from "@/lib/schemas";
import { CATEGORIES, COLORS, KIND_LABEL, LEARNING_CATEGORIES, RESOURCE_KINDS } from "@/lib/constants";
import type { ActionResult, Challenge, LibraryItem, Resource, Student, Subject } from "@/lib/types";

const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

/** Validates with the same Zod schema the server uses, then saves. */
function useSave(schema: z.ZodType, action: (v: unknown) => Promise<ActionResult>, success: string) {
  return async (value: unknown, after: (r: ActionResult) => void) => {
    const p = schema.safeParse(value);
    if (!p.success) { toast.error(p.error.issues[0].message); return; }
    const r = await action(p.data);
    if (r.error) { toast.error(r.error); return; }
    toast.success(success); after(r);
  };
}
const Submit = ({ busy, label = "Save" }: { busy: boolean; label?: string }) => <div className="flex justify-end"><Button type="submit" loading={busy}>{label}</Button></div>;

export function StudentDialog({ student, notes = "", subjectIds = [], subjects, teacherId }: { student?: Student; notes?: string; subjectIds?: string[]; subjects: Subject[]; teacherId: string }) {
  return (
    <Modal wide title={student ? "Edit student" : "Add student"} description={student ? undefined : "Students sign in with the class login, then pick their name."}
      trigger={student ? <Button variant="outline"><Pencil />Edit</Button> : <Button><UserPlus />Add student</Button>}>
      {(close) => <StudentFields {...{ student, notes, subjectIds, subjects, teacherId, close }} />}
    </Modal>
  );
}
function StudentFields({ student, notes, subjectIds, subjects, teacherId, close }: { student?: Student; notes: string; subjectIds: string[]; subjects: Subject[]; teacherId: string; close: () => void }) {
  const router = useRouter();
  const save = useSave(studentSchema, saveStudent, "Student saved");
  const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm({ defaultValues: {
    full_name: student?.full_name ?? "", username: student?.username ?? "", age: student?.age?.toString() ?? "", grade: student?.grade ?? "",
    interests: student?.interests.join(", ") ?? "", notes, avatar_color: student?.avatar_color ?? "indigo", avatar_path: student?.avatar_path ?? null as string | null, subject_ids: subjectIds,
  } });
  return (
    <form noValidate className="space-y-4" onSubmit={handleSubmit((v) => save({ ...v, id: student?.id, interests: split(v.interests), subject_ids: v.subject_ids || [] }, (r) => { close(); if (!student) router.push(`/teacher/students/${r.id}`); }))}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name"><Input {...register("full_name")} /></Field>
        <Field label="Username"><Input autoCapitalize="none" {...register("username")} /></Field>
        <Field label="Age (optional)"><Input type="number" {...register("age")} /></Field>
        <Field label="Grade or learning level"><Input {...register("grade")} /></Field>
      </div>
      <Field label="Learning interests" hint="Separate with commas"><Input {...register("interests")} /></Field>
      <fieldset><legend className="mb-1 text-[13px] font-medium">Subjects</legend>
        <div className="flex flex-wrap gap-3">{subjects.map((s) => <Checkbox key={s.id} label={s.name} checked={watch("subject_ids").includes(s.id)}
          onChange={(e) => setValue("subject_ids", e.target.checked ? [...watch("subject_ids"), s.id] : watch("subject_ids").filter((x) => x !== s.id))} />)}
          {!subjects.length && <span className="text-sm text-muted">Add subjects in Settings.</span>}</div></fieldset>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Avatar colour"><Select {...register("avatar_color")}>{Object.keys(COLORS).map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
        <UploadButton bucket="avatars" folder={teacherId} accept="image/png,image/jpeg,image/webp" label={watch("avatar_path") ? "Replace photo" : "Upload photo"} onDone={(p) => { setValue("avatar_path", p); toast.success("Photo ready. Save to apply."); }} />
        {watch("avatar_path") && <Button variant="ghost" size="sm" onClick={() => setValue("avatar_path", null)}>Remove photo</Button>}
      </div>
      <Field label="Teacher notes" hint="Private"><Textarea {...register("notes")} /></Field>
      <Submit busy={isSubmitting} />
    </form>
  );
}

export function ChallengeDialog({ challenge, resources = [], teacherId, library }: { challenge?: Challenge; resources?: Resource[]; teacherId: string; library: LibraryItem[] }) {
  return (
    <Modal wide title={challenge ? "Edit challenge" : "Create challenge"} trigger={challenge ? <Button variant="outline"><Pencil />Edit</Button> : <Button><Plus />Create challenge</Button>}>
      {(close) => <ChallengeFields {...{ challenge, resources, teacherId, library, close }} />}
    </Modal>
  );
}
function ChallengeFields({ challenge, resources, teacherId, library, close }: { challenge?: Challenge; resources: Resource[]; teacherId: string; library: LibraryItem[]; close: () => void }) {
  const router = useRouter();
  const save = useSave(challengeSchema, saveChallenge, "Challenge saved");
  const { register, control, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: {
    title: challenge?.title ?? "", category: challenge?.category ?? LEARNING_CATEGORIES[0], difficulty: challenge?.difficulty ?? "beginner", description: challenge?.description ?? "",
    objective: challenge?.objective ?? "", instructions: challenge?.instructions ?? "", required_resources: challenge?.required_resources ?? "",
    expected_outcome: challenge?.expected_outcome ?? "", submission_requirements: challenge?.submission_requirements ?? "", resources,
  } });
  return (
    <form noValidate className="space-y-5" onSubmit={handleSubmit((v) => save({ ...v, id: challenge?.id }, (r) => { close(); if (!challenge) router.push(`/teacher/challenges/${r.id}`); }))}>
      <section className="space-y-3">
      <div><h2 className="text-sm font-semibold">Challenge details</h2><p className="text-xs text-muted">Give students a clear goal and a level to aim for.</p></div>
      <Field label="Challenge title"><Input placeholder="e.g. Design a helpful invention" {...register("title")} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Learning category" hint="Choose the topic students will practise."><Select {...register("category")}>
          {[...new Set([...LEARNING_CATEGORIES, ...CATEGORIES, ...(challenge?.category ? [challenge.category] : [])])].map((c) => <option key={c} value={c}>{c}</option>)}
        </Select></Field>
        <Field label="Difficulty"><Select {...register("difficulty")}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></Select></Field>
      </div>
      <Field label="Description"><Textarea {...register("description")} /></Field>
      <Field label="Learning objective"><Textarea {...register("objective")} /></Field>
      </section>
      <section className="space-y-3 border-t border-line pt-4">
      <div><h2 className="text-sm font-semibold">Student instructions</h2><p className="text-xs text-muted">Explain the steps, what students should make, and what they need to submit.</p></div>
      <div className="space-y-1.5"><span className="text-[13px] font-medium">What to do</span>
        <Controller control={control} name="instructions" render={({ field }) => <RichText label="Instructions" value={field.value} onChange={field.onChange} />} /></div>
      <Field label="What students need"><Textarea {...register("required_resources")} /></Field>
      <Field label="Expected outcome"><Textarea placeholder="What should students have when they finish?" {...register("expected_outcome")} /></Field>
      <Field label="What to submit"><Textarea placeholder="For example: a project link and a short explanation" {...register("submission_requirements")} /></Field>
      <div className="space-y-1.5"><span className="text-[13px] font-medium">Reference documents, links and templates</span>
        <Controller control={control} name="resources" render={({ field }) => <ResourceEditor value={field.value} onChange={field.onChange} teacherId={teacherId} library={library} />} /></div>
      </section>
      <Submit busy={isSubmitting} />
    </form>
  );
}

export function AssignChallengeDialog({ challenges, students, challengeId, studentId, variant = "default" }: { challenges: Opt[]; students: Opt[]; challengeId?: string; studentId?: string; variant?: "default" | "outline" }) {
  const [c, setC] = React.useState(challengeId ?? "");
  const [mode, setMode] = React.useState<"custom" | "saved">(challengeId ? "saved" : "custom");
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<string>(LEARNING_CATEGORIES[0]);
  const [instructions, setInstructions] = React.useState("");
  const [who, setWho] = React.useState<string[]>(studentId ? [studentId] : []);
  const [deadline, setDeadline] = React.useState("");
  const { pending, run } = useAction();
  const router = useRouter();
  return (
    <Modal wide title="Assign challenge" description="Write a new challenge for this student, or choose one from your saved challenges." trigger={<Button variant={variant}><Send />Assign challenge</Button>}>
      {(close) => (
        <div className="space-y-5">
          {!challengeId && challenges.length > 0 && <div className="flex flex-wrap gap-2 rounded-xl bg-slate-50 p-1">
            <Button size="sm" variant={mode === "custom" ? "default" : "ghost"} onClick={() => setMode("custom")}>Write new challenge</Button>
            <Button size="sm" variant={mode === "saved" ? "default" : "ghost"} onClick={() => setMode("saved")}>Use saved challenge</Button>
          </div>}
          {mode === "custom" ? <section className="space-y-3">
            <div><h2 className="text-sm font-semibold">Challenge details</h2><p className="text-xs text-muted">Choose a platform or subject, then explain exactly what the student should accomplish.</p></div>
            <Field label="Challenge title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Create an interactive story" /></Field>
            <Field label="Challenge category"><Select value={category} onChange={(e) => setCategory(e.target.value)}>{LEARNING_CATEGORIES.map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Specific challenge instructions"><Textarea className="min-h-28" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Describe what the student should make or complete…" /></Field>
          </section> : (
            <section className="space-y-3"><div><h2 className="text-sm font-semibold">Saved challenge</h2><p className="text-xs text-muted">Students will see the saved challenge instructions and resources.</p></div>
              {!challengeId && <Field label="Challenge"><Select value={c} onChange={(e) => setC(e.target.value)}><option value="">Choose a challenge…</option>{challenges.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select></Field>}
            </section>
          )}
          <section className="space-y-3 border-t border-line pt-4"><div><h2 className="text-sm font-semibold">Assign to students</h2><p className="text-xs text-muted">Choose one or more students and set an optional deadline.</p></div>
          <StudentPicker students={students} value={who} onChange={setWho} />
          <Field label="Deadline (optional)"><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
          </section>
          <div className="flex justify-end"><Button loading={pending} onClick={() => {
            const after = () => { close(); router.refresh(); };
            if (mode === "custom") {
              if (!title.trim()) { toast.error("Enter a challenge title."); return; }
              if (!instructions.trim()) { toast.error("Add specific challenge instructions."); return; }
              if (!who.length) { toast.error("Choose at least one student."); return; }
              run(createAndAssignChallenge, { title, category, instructions, student_ids: who, deadline: deadline || null }, "Challenge assigned", after);
            } else {
              if (!c) { toast.error("Choose a challenge."); return; }
              if (!who.length) { toast.error("Choose at least one student."); return; }
              run(assignChallenge, { challenge_id: c, student_ids: who, deadline: deadline || null }, "Challenge assigned", after);
            }
          }}>Assign</Button></div>
        </div>
      )}
    </Modal>
  );
}

type ProjectValue = { id: string; title: string; instructions: string; due_date: string | null };
export function ProjectDialog({ project, studentIds = [], resources = [], students, teacherId, library }: { project?: ProjectValue; studentIds?: string[]; resources?: Resource[]; students: Opt[]; teacherId: string; library: LibraryItem[] }) {
  return (
    <Modal wide title={project ? "Edit project" : "New project"} description="Attach Google Drive or Docs links students need."
      trigger={project ? <Button variant="outline" size="sm"><Pencil />Edit</Button> : <Button><Plus />New project</Button>}>
      {(close) => <ProjectFields {...{ project, studentIds, resources, students, teacherId, library, close }} />}
    </Modal>
  );
}
function ProjectFields({ project, studentIds, resources, students, teacherId, library, close }: { project?: ProjectValue; studentIds: string[]; resources: Resource[]; students: Opt[]; teacherId: string; library: LibraryItem[]; close: () => void }) {
  const save = useSave(projectSchema, saveProject, "Project saved");
  const { register, control, handleSubmit, formState: { isSubmitting } } = useForm({ defaultValues: { title: project?.title ?? "", instructions: project?.instructions ?? "", due_date: project?.due_date ?? "", student_ids: studentIds, resources } });
  return (
    <form noValidate className="space-y-3" onSubmit={handleSubmit((v) => save({ ...v, id: project?.id, due_date: v.due_date || null }, close))}>
      <Field label="Project title"><Input {...register("title")} /></Field>
      <div className="space-y-1.5"><span className="text-[13px] font-medium">Instructions</span>
        <Controller control={control} name="instructions" render={({ field }) => <RichText label="Instructions" value={field.value} onChange={field.onChange} />} /></div>
      <Field label="Due date (optional)"><Input type="date" {...register("due_date")} /></Field>
      <Controller control={control} name="student_ids" render={({ field }) => <StudentPicker students={students} value={field.value} onChange={field.onChange} />} />
      <div className="space-y-1.5"><span className="text-[13px] font-medium">Reference documents and links</span>
        <Controller control={control} name="resources" render={({ field }) => <ResourceEditor value={field.value} onChange={field.onChange} teacherId={teacherId} library={library} />} /></div>
      <Submit busy={isSubmitting} />
    </form>
  );
}

export function LibraryDialog({ item, teacherId }: { item?: LibraryItem; teacherId: string }) {
  return (
    <Modal title={item ? "Edit resource" : "Add resource"} trigger={item ? <Button variant="ghost" size="icon" aria-label={`Edit ${item.title}`}><Pencil /></Button> : <Button><Plus />Add resource</Button>}>
      {(close) => <LibraryFields item={item} teacherId={teacherId} close={close} />}
    </Modal>
  );
}
function LibraryFields({ item, teacherId, close }: { item?: LibraryItem; teacherId: string; close: () => void }) {
  const save = useSave(librarySchema, saveLibraryItem, "Resource saved");
  const { register, handleSubmit, watch, setValue, formState: { isSubmitting } } = useForm({ defaultValues: {
    title: item?.title ?? "", kind: item?.kind ?? "website", category: item?.category ?? "", url: item?.url ?? "", file_path: item?.file_path ?? null as string | null, tags: item?.tags.join(", ") ?? "", description: item?.description ?? "" } });
  return (
    <form noValidate className="space-y-3" onSubmit={handleSubmit((v) => save({ ...v, id: item?.id, tags: split(v.tags) }, close))}>
      <Field label="Title"><Input {...register("title")} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type"><Select {...register("kind")}>{RESOURCE_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</Select></Field>
        <Field label="Category"><Input {...register("category")} placeholder="e.g. Scratch" /></Field>
      </div>
      <Field label="Link"><Input type="url" placeholder="https://…" {...register("url")} /></Field>
      <div className="flex items-center gap-2">
        <UploadButton bucket="resources" folder={teacherId} label={watch("file_path") ? "Replace file" : "Or upload a file"} onDone={(p, n) => { setValue("file_path", p); if (!watch("title")) setValue("title", n); }} />
        {watch("file_path") && <><span className="text-sm text-teal">File attached</span><Button variant="ghost" size="sm" onClick={() => setValue("file_path", null)}>Remove</Button></>}
      </div>
      <Field label="Tags" hint="Separate with commas"><Input {...register("tags")} /></Field>
      <Field label="Description"><Textarea {...register("description")} /></Field>
      <Submit busy={isSubmitting} />
    </form>
  );
}

export function ReviewForm({ id }: { id: string }) {
  const [feedback, setFeedback] = React.useState("");
  const { pending, run } = useAction();
  const go = (status: string, msg: string) => run(reviewSubmission, { id, status, feedback }, msg, () => setFeedback(""));
  return (
    <div className="space-y-2">
      <Textarea aria-label="Feedback for the student" placeholder="Feedback for the student (optional)" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <Button variant="teal" size="sm" disabled={pending} onClick={() => go("approved", "Approved")}>Approve</Button>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => go("needs_revision", "Marked for revision")}>Needs revision</Button>
        <Button variant="danger" size="sm" disabled={pending} onClick={() => go("resubmit", "Resubmission requested")}>Request resubmission</Button>
      </div>
    </div>
  );
}

export function FeedbackForm({ studentId, assignmentId, activityId, compact }: { studentId: string; assignmentId?: string; activityId?: string; compact?: boolean }) {
  const [body, setBody] = React.useState("");
  const [kind, setKind] = React.useState("feedback");
  const { pending, run } = useAction();
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); run(addFeedback, { student_id: studentId, kind, body, assignment_id: assignmentId ?? null, activity_id: activityId ?? null }, "Saved", () => setBody("")); }}>
      <Textarea aria-label="Feedback" className={compact ? "min-h-14" : undefined} placeholder="Write feedback…" value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex gap-2">
        <Select aria-label="Type of note" className="h-8 w-auto text-xs" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="feedback">Feedback (student sees it)</option><option value="achievement">Achievement (student sees it)</option><option value="observation">Private observation</option>
        </Select>
        <Button type="submit" size="sm" loading={pending} disabled={!body.trim()}>Add</Button>
      </div>
    </form>
  );
}
