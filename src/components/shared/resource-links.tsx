import { BookOpen, Download, ExternalLink, FileText, Play, PlayCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACTION_LABEL } from "@/lib/constants";
import type { Resource } from "@/lib/types";

const icons = { open: BookOpen, start: Play, watch: PlayCircle, doc: FileText, download: Download, submit: Upload };
export const fileHref = (bucket: "resources" | "submissions", path: string) => `/api/files?bucket=${bucket}&path=${encodeURIComponent(path)}`;

export function ResourceLinks({ items }: { items: Resource[] }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((r, i) => {
        const Icon = icons[r.action as keyof typeof icons] ?? ExternalLink;
        const links = [r.url && { href: r.url, kind: "url" }, r.file_path && { href: fileHref("resources", r.file_path), kind: "file" }].filter(Boolean) as { href: string; kind: string }[];
        return links.map((l) => (
          <li key={`${i}-${l.kind}`} className="max-w-full">
            <Button asChild variant="outline" className="h-auto min-h-10 max-w-full whitespace-normal py-1.5 text-left">
              <a href={l.href} target="_blank" rel="noopener noreferrer">
                {l.kind === "file" ? <Download /> : <Icon />}
                <span><span className="block leading-tight">{l.kind === "file" && r.url ? "Download file" : ACTION_LABEL[r.action]}</span><span className="block text-xs font-normal text-muted">{r.label}</span></span>
              </a>
            </Button>
          </li>
        ));
      })}
    </ul>
  );
}
