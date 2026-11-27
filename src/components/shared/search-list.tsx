"use client";
import * as React from "react";
import { Search, SearchX } from "lucide-react";
import { Input, Select } from "@/components/ui/form";

export type SearchItem = { key: string; text: string; tags?: string[]; node: React.ReactNode };

/** Instant client-side search and one optional filter over server-rendered cards. */
export function SearchList({ items, placeholder, filter, className = "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" }: {
  items: SearchItem[]; placeholder: string; filter?: { label: string; options: string[] }; className?: string;
}) {
  const [q, setQ] = React.useState("");
  const [tag, setTag] = React.useState("");
  const shown = items.filter((i) => i.text.toLowerCase().includes(q.trim().toLowerCase()) && (!tag || i.tags?.includes(tag)));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted" />
          <Input aria-label={placeholder} placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        {filter && (
          <Select aria-label={filter.label} value={tag} onChange={(e) => setTag(e.target.value)} className="w-auto">
            <option value="">{filter.label}</option>
            {filter.options.map((o) => <option key={o}>{o}</option>)}
          </Select>
        )}
      </div>
      {shown.length ? <div className={className}>{shown.map((i) => <div key={i.key} className="min-w-0">{i.node}</div>)}</div>
        : <p className="flex items-center gap-2 py-8 text-sm text-muted"><SearchX className="size-4" />Nothing matches your search.</p>}
    </div>
  );
}
