import { FolderCheck } from "lucide-react";
import { requireStudent } from "@/lib/auth";
import { clean, must, resourcesFor } from "@/lib/data";
import { fmtDate } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import { Empty, PageHeader, Rich } from "@/components/shared/bits";
import { ResourceLinks } from "@/components/shared/resource-links";
import { SubmissionCard } from "@/components/shared/submission-card";
import { SubmitWork } from "@/components/student/controls";
import type { Feedback, Submission } from "@/lib/types";

export const metadata = { title: "My Projects" };

export default async function MyProjects() {
  const { db, student, profile, timezone } = await requireStudent();
  const [pr, sr, fr] = await Promise.all([
    db.from("project_assignments").select("projects(id, title, instructions, due_date)").eq("student_id", student.id).order("created_at", { ascending: false }),
    db.from("submissions").select("*").eq("student_id", student.id).order("created_at", { ascending: false }),
    db.from("teacher_feedback").select("*").eq("student_id", student.id),
  ]);
  const projects = must<{ projects: { id: string; title: string; instructions: string; due_date: string | null } }[]>(pr as never).map((x) => x.projects);
  const subs = must<Submission[]>(sr), feedback = must<Feedback[]>(fr);
  const res = await resourcesFor(db, "project_id", projects.map((p) => p.id));
  const other = subs.filter((s) => !s.project_id);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="My projects" subtitle="Project instructions, documents and everything you have sent." />
      {!projects.length && <Empty icon={FolderCheck} title="No projects assigned yet" />}
      {projects.map((p) => {
        const mine = subs.filter((s) => s.project_id === p.id);
        return (
          <Card key={p.id} className="space-y-3">
            <div><CardTitle className="text-lg">{p.title}</CardTitle>{p.due_date && <p className="text-xs text-muted">Due {fmtDate(p.due_date, "EEEE d MMMM")}</p>}</div>
            <Rich html={clean(p.instructions)} />
            <ResourceLinks items={res[p.id] ?? []} />
            {mine.map((s) => <SubmissionCard key={s.id} s={s} timezone={timezone} feedback={feedback} heading="Your submission" />)}
            {!mine.some((s) => s.status === "submitted") && <SubmitWork type="project" target={p.id} folder={`${profile.teacher_id}/${student.id}`} label={mine.length ? "Submit again" : "Submit your work"} />}
          </Card>);
      })}
      {other.length > 0 && <><h2 className="pt-3 text-lg font-semibold">Lesson and challenge work</h2>{other.map((s) => <SubmissionCard key={s.id} s={s} timezone={timezone} feedback={feedback} />)}</>}
    </div>
  );
}
