"use client";
import * as React from "react";
import { toast } from "sonner";
import { Library, Link2, Loader2, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/dialog";
import { ACTION_LABEL } from "@/lib/constants";
import { uploadFile } from "@/lib/upload";
import type { LibraryItem, Resource } from "@/lib/types";

const ACTION_FOR: Record<string, string> = { google_doc: "doc", video: "watch", worksheet: "download", pdf: "download", template: "start" };

export function UploadButton({ bucket, folder, onDone, label = "Upload file", accept }: { bucket: string; folder: string; onDone: (path: string, name: string) => void; label?: string; accept?: string }) {
  const [busy, setBusy] = React.useState(false);
  return (
    <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 text-[13px] font-medium hover:bg-brand-soft focus-within:outline-2 focus-within:outline-brand">
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}{busy ? "Uploading…" : label}
      <input type="file" className="sr-only" accept={accept} disabled={busy} onChange={async (e) => {
        const file = e.target.files?.[0]; e.target.value = "";
        if (!file) return;
        setBusy(true);
        try { onDone(await uploadFile(bucket, folder, file), file.name); }
        catch (err) { toast.error(err instanceof Error ? err.message : "Upload failed."); }
        finally { setBusy(false); }
      }} />
    </label>
  );
}

/** Links and files for a lesson, activity, challenge or project, with reuse from the library. */
export function ResourceEditor({ value, onChange, teacherId, library }: { value: Resource[]; onChange: (v: Resource[]) => void; teacherId: string; library: LibraryItem[] }) {
  const latest = React.useRef(value);
  latest.current = value;
  const set = (i: number, patch: Partial<Resource>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const add = (r: Resource) => onChange([...latest.current, r]);
  const [q, setQ] = React.useState("");
  const found = library.filter((l) => `${l.title} ${l.category} ${l.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-2">
      {value.map((r, i) => (
        <div key={i} className="grid gap-2 rounded-xl border border-line bg-slate-50/70 p-2 sm:grid-cols-[1fr_1.4fr_auto_auto]">
          <Input aria-label="Resource name" placeholder="Name" value={r.label} onChange={(e) => set(i, { label: e.target.value })} />
          {r.file_path ? <span className="flex items-center gap-2 truncate px-1 text-sm text-muted"><Paperclip className="size-4 shrink-0" />Uploaded file attached</span>
            : <Input aria-label="Resource link" placeholder="https://…" type="url" value={r.url ?? ""} onChange={(e) => set(i, { url: e.target.value })} />}
          <Select aria-label="Button style" value={r.action} onChange={(e) => set(i, { action: e.target.value })} className="sm:w-52">
            {Object.entries(ACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Button variant="ghost" size="icon" aria-label="Remove resource" onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 /></Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => add({ label: "", action: "open", url: "", file_path: null })}><Link2 />Add link</Button>
        <UploadButton bucket="resources" folder={teacherId} onDone={(path, name) => add({ label: name, action: "download", url: null, file_path: path })} />
        <Modal title="Reuse from Resource Library" trigger={<Button variant="outline" size="sm"><Library />From library</Button>}>
          {(close) => (
            <div className="space-y-3">
              <Input placeholder="Search by title, category or tag" aria-label="Search library" value={q} onChange={(e) => setQ(e.target.value)} />
              <ul className="max-h-80 space-y-1 overflow-y-auto">
                {found.map((l) => (
                  <li key={l.id}><button type="button" className="w-full cursor-pointer rounded-xl border border-line px-3 py-2 text-left hover:border-brand hover:bg-brand-soft"
                    onClick={() => { add({ label: l.title, action: ACTION_FOR[l.kind] ?? "open", url: l.url, file_path: l.file_path }); close(); }}>
                    <span className="block text-sm font-medium">{l.title}</span><span className="text-xs text-muted">{l.category}</span></button></li>
                ))}
                {!found.length && <li className="py-4 text-center text-sm text-muted">No library items match.</li>}
              </ul>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
