"use client";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

export function RichText({ value, onChange, label }: { value: string; onChange: (html: string) => void; label: string }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false, defaultProtocol: "https" } })],
    content: value, immediatelyRender: false,
    editorProps: { attributes: { class: "rich text-sm", "aria-label": label, role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });
  const active = useEditorState({ editor, selector: ({ editor }) => ({
    bold: editor?.isActive("bold"), italic: editor?.isActive("italic"), h: editor?.isActive("heading", { level: 2 }),
    ul: editor?.isActive("bulletList"), ol: editor?.isActive("orderedList"), quote: editor?.isActive("blockquote"), link: editor?.isActive("link"),
  }) });
  const c = () => editor!.chain().focus();
  const setLink = () => {
    const href = window.prompt("Link address (https://…)", editor?.getAttributes("link").href ?? "https://");
    if (href === null) return;
    if (!/^https?:\/\/.+/.test(href)) c().unsetLink().run();
    else if (editor!.state.selection.empty && !editor!.isActive("link")) c().insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    else c().extendMarkRange("link").setLink({ href }).run();
  };
  const tools = [
    ["Bold", Bold, () => c().toggleBold().run(), active?.bold], ["Italic", Italic, () => c().toggleItalic().run(), active?.italic],
    ["Heading", Heading2, () => c().toggleHeading({ level: 2 }).run(), active?.h], ["Bullet list", List, () => c().toggleBulletList().run(), active?.ul],
    ["Numbered steps", ListOrdered, () => c().toggleOrderedList().run(), active?.ol], ["Quote", Quote, () => c().toggleBlockquote().run(), active?.quote],
    ["Link", Link2, setLink, active?.link],
  ] as const;
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
      <div className="flex flex-wrap gap-0.5 border-b border-line bg-slate-50/80 p-1.5">
        {tools.map(([name, Icon, run, on]) => (
          <button key={name} type="button" title={name} aria-label={name} aria-pressed={!!on} onClick={() => editor && run()}
            className={cn("cursor-pointer rounded-md p-1.5 text-muted transition hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-brand", on && "bg-brand-soft text-brand-dark")}><Icon className="size-4" /></button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
