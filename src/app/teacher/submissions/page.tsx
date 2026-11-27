import { ChevronRight, Folder, FolderOpen, Inbox, Trash2 } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { clean, must, resourcesFor } from "@/lib/data";
import { getLibrary, getStudents, options } from "@/lib/queries";
import { fmtDate, todayIn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge, Empty, PageHeader, Rich, Tabs } from "@/components/shared/bits";
import { ResourceLinks } from "@/components/shared/resource-links";
import { ActionButton } from "@/components/shared/action-button";
import { SubmissionCard } from "@/components/shared/submission-card";
import { ProjectDialog, ReviewForm } from "@/components/teacher/forms";
import { deleteProject } from "@/actions/content";
import type { Feedback, Submission } from "@/lib/types";

export const metadata = { title: "Project Submissions" };

type Project = { id: string; title: string; instructions: string; due_date: string | null; project_assignments: { student_id: string }[] };

const FolderRow = ({ name, count, pending }: { name: string; count: number; pending: number }) => (
  <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium hover:bg-brand-soft">
    <ChevronRight className="size-4 text-muted transition group-open/f:rotate-90" /><Folder className="size-4 text-brand" />{name}
    <span className="text-xs font-normal text-muted">{count}</span>{pending > 0 && <Badge tone="amber">{pending} to review</Badge>}
  </summary>
);

export default async function Submissions({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab ?? "review";
  const { db, profile } = await requireTeacher();
  const [subRes, fbRes, prRes, students, library] = await Promise.all([
    db.from("submissions").select("*").order("created_at", { ascending: false }).limit(500),
    db.from("teacher_feedback").select("*").not("submission_id", "is", null),
    db.from("projects").select("*, project_assignments(student_id)").order("created_at", { ascending: false }),
    getStudents(db), getLibrary(db),
  ]);
  const subs = must<Submission[]>(subRes), feedback = must<Feedback[]>(fbRes), projects = must<Project[]>(prRes);
  const name = (id: string) => students.find((s) => s.id === id)?.full_name ?? "Student";
  const waiting = subs.filter((s) => s.status === "submitted");
  const res = tab === "projects" ? await resourcesFor(db, "project_id", projects.map((p) => p.id)) : {};
  const card = (s: Submission, heading?: string) => <SubmissionCard key={s.id} s={s} heading={heading} timezone={profile.timezone} feedback={feedback}>{s.status === "submitted" && <ReviewForm id={s.id} />}</SubmissionCard>;
  const group = <T,>(list: T[], key: (x: T) => string) => list.reduce<Record<string, T[]>>((m, x) => ((m[key(x)] ??= []).push(x), m), {});

  return (
    <>
      <PageHeader title="Project Submissions" subtitle={`${waiting.length} waiting for review`}><ProjectDialog students={options(students)} teacherId={profile.id} library={library} /></PageHeader>
      <Tabs active={tab} items={[["review", "To review"], ["folders", "Folders"], ["projects", "Project briefs"]].map(([key, label]) => ({ key, label, href: `/teacher/submissions?tab=${key}` }))} />

      {tab === "review" && (waiting.length ? <div className="space-y-3">{waiting.map((s) => card(s, `${name(s.student_id)} — ${s.title}`))}</div>
        : <Empty icon={Inbox} title="All caught up">New student work will appear here.</Empty>)}

      {tab === "folders" && (subs.length ? (
        <Card className="p-3">
          {Object.entries(group(subs, (s) => s.student_id)).sort((a, b) => name(a[0]).localeCompare(name(b[0]))).map(([sid, mine]) => (
            <details key={sid} className="group/f">
              <FolderRow name={name(sid)} count={mine.length} pending={mine.filter((s) => s.status === "submitted").length} />
              <div className="ml-4 border-l border-line pl-3">
                {Object.entries(group(mine, (s) => s.title)).map(([title, list]) => (
                  <details key={title} className="[&[open]>summary>svg:first-child]:rotate-90">
                    <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-brand-soft"><ChevronRight className="size-4 text-muted transition" /><FolderOpen className="size-4 text-teal" />{title}<span className="text-xs text-muted">{list.length}</span></summary>
                    <div className="ml-4 space-y-3 border-l border-line py-1 pl-3">
                      {Object.entries(group(list, (s) => todayIn(profile.timezone, new Date(s.created_at)))).map(([day, items]) => (
                        <div key={day} className="space-y-2"><p className="text-xs font-semibold text-muted">{fmtDate(day, "EEEE d MMMM yyyy")}</p>{items.map((s) => card(s))}</div>))}
                    </div>
                  </details>))}
              </div>
            </details>))}
        </Card>
      ) : <Empty icon={Folder} title="No submissions yet" />)}

      {tab === "projects" && (projects.length ? (
        <div className="grid gap-3 md:grid-cols-2">{projects.map((p) => (
          <Card key={p.id} className="space-y-3">
            <div><p className="font-semibold">{p.title}</p><p className="text-xs text-muted">{p.due_date ? `Due ${fmtDate(p.due_date)} · ` : ""}{p.project_assignments.map((a) => name(a.student_id)).join(", ") || "No students"}</p></div>
            <Rich html={clean(p.instructions)} />
            <ResourceLinks items={res[p.id] ?? []} />
            <div className="flex gap-2">
              <ProjectDialog project={p} studentIds={p.project_assignments.map((a) => a.student_id)} resources={(res[p.id] ?? []).map(({ id: _i, ...r }) => r)} students={options(students)} teacherId={profile.id} library={library} />
              <ActionButton variant="danger" size="sm" action={deleteProject} input={{ id: p.id }} confirm="Delete this project and everything submitted for it?"><Trash2 />Delete</ActionButton>
            </div>
          </Card>))}</div>
      ) : <Empty icon={Folder} title="No project briefs yet">Create a project and attach its Google Drive or Docs links.</Empty>)}
    </>
  );
}
