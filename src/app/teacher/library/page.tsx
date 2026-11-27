import { ExternalLink, Library, Paperclip, Trash2 } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { getLibrary } from "@/lib/queries";
import { KIND_LABEL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, Empty, PageHeader } from "@/components/shared/bits";
import { SearchList } from "@/components/shared/search-list";
import { fileHref } from "@/components/shared/resource-links";
import { ActionButton } from "@/components/shared/action-button";
import { LibraryDialog } from "@/components/teacher/forms";
import { deleteLibraryItem } from "@/actions/content";

export const metadata = { title: "Resource Library" };

export default async function ResourceLibrary() {
  const { db, profile } = await requireTeacher();
  const items = await getLibrary(db);
  return (
    <>
      <PageHeader title="Resource Library" subtitle="Add once, reuse in any lesson, challenge or project."><LibraryDialog teacherId={profile.id} /></PageHeader>
      {!items.length ? <Empty icon={Library} title="The library is empty">Add Google Docs, Drive folders, PDFs, videos or websites.</Empty> : (
        <SearchList placeholder="Search by title or tag" filter={{ label: "All categories", options: [...new Set(items.map((i) => i.category))].sort() }} items={items.map((r) => ({
          key: r.id, text: `${r.title} ${r.category} ${r.tags.join(" ")} ${r.description} ${KIND_LABEL[r.kind]}`, tags: [r.category],
          node: (
            <Card className="flex h-full flex-col gap-2">
              <div className="flex items-start justify-between gap-2"><Badge tone="blue">{KIND_LABEL[r.kind] ?? r.kind}</Badge>
                <div className="flex"><LibraryDialog item={r} teacherId={profile.id} />
                  <ActionButton variant="ghost" size="icon" aria-label={`Delete ${r.title}`} action={deleteLibraryItem} input={{ id: r.id }} confirm="Remove from the library? Lessons that already use it keep their copy."><Trash2 /></ActionButton></div></div>
              <p className="font-semibold">{r.title}</p>
              <p className="flex-1 text-sm text-muted">{r.description}</p>
              <p className="text-xs text-muted">{r.category}{r.tags.length ? ` · ${r.tags.map((t) => `#${t}`).join(" ")}` : ""}</p>
              <div className="flex flex-wrap gap-2">
                {r.url && <Button asChild size="sm" variant="outline"><a href={r.url} target="_blank" rel="noopener noreferrer"><ExternalLink />Open</a></Button>}
                {r.file_path && <Button asChild size="sm" variant="outline"><a href={fileHref("resources", r.file_path)} target="_blank" rel="noopener noreferrer"><Paperclip />Download</a></Button>}
              </div>
            </Card>),
        }))} />
      )}
    </>
  );
}
