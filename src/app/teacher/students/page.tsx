import Link from "next/link";
import { Users } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { must } from "@/lib/data";
import { avatarsFor, getStudents, getSubjects } from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Avatar, Badge, Empty, PageHeader } from "@/components/shared/bits";
import { SearchList } from "@/components/shared/search-list";
import { StudentDialog } from "@/components/teacher/forms";

export const metadata = { title: "Students" };

export default async function Students() {
  const { db, profile } = await requireTeacher();
  const [students, subjects, links] = await Promise.all([getStudents(db), getSubjects(db), db.from("student_subjects").select("student_id, subject_id")]);
  const subj = must<{ student_id: string; subject_id: string }[]>(links);
  const avatars = await avatarsFor(db, students);
  return (
    <>
      <PageHeader title="Students" subtitle={`${students.filter((s) => s.is_active).length} active`}><StudentDialog subjects={subjects} teacherId={profile.id} /></PageHeader>
      {!students.length ? <Empty icon={Users} title="No students yet">Add a student to get started.</Empty> : (
        <SearchList placeholder="Search students" filter={{ label: "All statuses", options: ["Active", "Deactivated"] }} items={students.map((s) => {
          const names = subj.filter((x) => x.student_id === s.id).map((x) => subjects.find((y) => y.id === x.subject_id)?.name ?? "");
          return {
            key: s.id, text: `${s.full_name} ${s.username} ${s.grade ?? ""} ${names.join(" ")} ${s.interests.join(" ")}`, tags: [s.is_active ? "Active" : "Deactivated"],
            node: (
              <Link href={`/teacher/students/${s.id}`}><Card className="h-full transition hover:-translate-y-0.5 hover:shadow-lift">
                <div className="flex items-center gap-3"><Avatar name={s.full_name} color={s.avatar_color} src={s.avatar_path ? avatars[s.avatar_path] : undefined} />
                  <div className="min-w-0"><p className="truncate font-semibold">{s.full_name}</p><p className="truncate text-xs text-muted">@{s.username}{s.grade ? ` · ${s.grade}` : ""}</p></div></div>
                <div className="mt-3 flex flex-wrap gap-1.5">{!s.is_active && <Badge tone="red">Deactivated</Badge>}{names.map((n) => <Badge key={n} tone="blue">{n}</Badge>)}</div>
              </Card></Link>),
          };
        })} />
      )}
    </>
  );
}
