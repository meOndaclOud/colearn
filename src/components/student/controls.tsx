"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Check, CheckCircle2, Paperclip, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/dialog";
import { UploadButton } from "@/components/editor/resource-editor";
import { useAction } from "@/components/shared/action-button";
import { setActivityStatus, startChallenge, submitWork } from "@/actions/student";
import { cn } from "@/lib/utils";

export function StatusControl({ assignmentId, activityId, status, requiresReview }: { assignmentId: string; activityId: string; status: string; requiresReview: boolean }) {
  const { pending, run } = useAction();
  if (requiresReview && status === "completed")
    return <p className="flex items-center gap-2 text-sm font-medium text-teal"><motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle2 className="size-5" /></motion.span>Approved by your teacher</p>;
  const set = (s: string) => run(setActivityStatus, { assignment_id: assignmentId, activity_id: activityId, status: s }, undefined, (r) =>
    toast.success(r.id === "awaiting_review" ? "Sent to your teacher to check" : r.id === "completed" ? "Well done!" : "Saved"));
  const options = [["not_started", "Not started"], ["in_progress", "In progress"], ["completed", requiresReview ? "I'm done — ask teacher" : "Completed"]];
  return (
    <div className="space-y-1.5">
      <div role="group" aria-label="Activity status" className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {options.map(([key, label]) => {
          const on = status === key || (key === "completed" && status === "awaiting_review");
          return (
            <button key={key} type="button" disabled={pending} aria-pressed={on} onClick={() => !on && set(key)}
              className={cn("flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50", on ? key === "completed" ? "bg-teal text-white shadow-soft" : "bg-white text-ink shadow-soft" : "text-muted hover:text-ink")}>
              {on && key === "completed" && <Check className="size-4" />}{key === "completed" && status === "awaiting_review" ? "Waiting for teacher" : label}
            </button>);
        })}
      </div>
    </div>
  );
}

export function StartChallenge({ id }: { id: string }) {
  const { pending, run } = useAction();
  return <Button loading={pending} onClick={() => run(startChallenge, { id }, "Challenge started")}>Start challenge</Button>;
}

export function SubmitWork({ type, target, assignmentId, folder, label = "Submit your work" }: { type: "activity" | "challenge" | "project"; target: string; assignmentId?: string; folder: string; label?: string }) {
  return (
    <Modal title="Submit your work" description="Add a link, a file, or both." trigger={<Button><Send />{label}</Button>}>
      {(close) => <SubmitForm {...{ type, target, assignmentId, folder, close }} />}
    </Modal>
  );
}
function SubmitForm({ type, target, assignmentId, folder, close }: { type: string; target: string; assignmentId?: string; folder: string; close: () => void }) {
  const [link, setLink] = React.useState("");
  const [comment, setComment] = React.useState("");
  const [file, setFile] = React.useState<{ path: string; name: string } | null>(null);
  const { pending, run } = useAction();
  // folder = teacher/student; files are filed by target and date
  const dir = `${folder}/${target}/${new Date().toISOString().slice(0, 10)}`;
  return (
    <form className="space-y-3" noValidate onSubmit={(e) => {
      e.preventDefault();
      if (!link.trim() && !file) { toast.error("Add a link or choose a file."); return; }
      run(submitWork, { type, target, assignment_id: assignmentId ?? null, link: link.trim() || null, file_path: file?.path ?? null, file_name: file?.name ?? null, comment }, "Sent to your teacher", close);
    }}>
      <Field label="Link to your work" hint="Google Drive, Scratch, Tinkercad or any web address"><Input type="url" placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} /></Field>
      <div className="flex flex-wrap items-center gap-2">
        <UploadButton bucket="submissions" folder={dir} label={file ? "Choose a different file" : "Upload a file"} onDone={(path, name) => setFile({ path, name })} />
        {file && <span className="flex min-w-0 items-center gap-1 text-sm text-teal"><Paperclip className="size-4 shrink-0" /><span className="truncate">{file.name}</span>
          <button type="button" aria-label="Remove file" onClick={() => setFile(null)} className="cursor-pointer text-muted"><X className="size-4" /></button></span>}
      </div>
      <Field label="Comment (optional)"><Textarea value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
      <div className="flex justify-end"><Button type="submit" loading={pending}>Send</Button></div>
    </form>
  );
}
