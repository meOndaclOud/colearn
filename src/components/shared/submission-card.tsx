import { ExternalLink, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./bits";
import { fileHref } from "./resource-links";
import { fmtDateTime } from "@/lib/utils";
import type { Feedback, Submission } from "@/lib/types";

export function SubmissionCard({ s, timezone, feedback, children, heading }: { s: Submission; timezone: string; feedback: Feedback[]; children?: React.ReactNode; heading?: string }) {
  const notes = feedback.filter((f) => f.submission_id === s.id);
  return (
    <div className="space-y-2 rounded-xl border border-line bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{heading ?? s.title}<span className="ml-2 text-xs font-normal text-muted">{fmtDateTime(s.created_at, timezone)}</span></p>
        <StatusBadge status={s.status} />
      </div>
      {s.comment && <p className="whitespace-pre-line text-sm text-muted">{s.comment}</p>}
      <div className="flex flex-wrap gap-2">
        {s.link_url && <Button asChild variant="outline" size="sm"><a href={s.link_url} target="_blank" rel="noopener noreferrer"><ExternalLink />Open link</a></Button>}
        {s.file_path && <Button asChild variant="outline" size="sm" className="max-w-full"><a href={fileHref("submissions", s.file_path)} target="_blank" rel="noopener noreferrer"><Paperclip /><span className="truncate">{s.file_name ?? "Download file"}</span></a></Button>}
      </div>
      {notes.map((n) => <p key={n.id} className="rounded-lg bg-teal-soft px-3 py-2 text-sm"><b>Teacher:</b> {n.body}</p>)}
      {children}
    </div>
  );
}
