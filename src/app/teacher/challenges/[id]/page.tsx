import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2, Users } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { clean, must, resourcesFor } from "@/lib/data";
import { getLibrary, getStudents, options } from "@/lib/queries";
import { fmtDate } from "@/lib/utils";
import { STATUS } from "@/lib/constants";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge, Empty, PageHeader } from "@/components/shared/bits";
import { ActionButton, QuickSelect } from "@/components/shared/action-button";
import { ChallengeBrief } from "@/components/shared/challenge-brief";
import { AssignChallengeDialog, ChallengeDialog } from "@/components/teacher/forms";
import { deleteChallenge, removeChallengeAssignment, updateChallengeAssignment } from "@/actions/content";
import type { Challenge, ChallengeAssignment } from "@/lib/types";

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, profile } = await requireTeacher();
  const { data } = await db.from("challenges").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const c = data as Challenge;
  const [res, assigned, students, library] = await Promise.all([resourcesFor(db, "challenge_id", [id]), db.from("challenge_assignments").select("*").eq("challenge_id", id), getStudents(db), getLibrary(db)]);
  const rows = must<ChallengeAssignment[]>(assigned);
  const resources = res[id] ?? [];
  return (
    <>
      <PageHeader back={{ href: "/teacher/challenges", label: "Challenge Centre" }} title={c.title} subtitle={<span className="flex gap-1.5"><Badge tone="blue">{c.category}</Badge><Badge>{c.difficulty}</Badge></span>}>
        <AssignChallengeDialog challenges={[]} challengeId={id} students={options(students)} />
        <ChallengeDialog challenge={c} resources={resources.map(({ id: _i, ...r }) => r)} teacherId={profile.id} library={library} />
        <ActionButton variant="danger" action={deleteChallenge} input={{ id }} redirectTo="/teacher/challenges" success="Challenge deleted" confirm="Delete this challenge, its assignments and submissions?"><Trash2 />Delete</ActionButton>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChallengeBrief c={{ ...c, instructions: clean(c.instructions) }} resources={resources} />
        <Card className="self-start"><CardTitle className="mb-3">Assigned students</CardTitle>
          {!rows.length && <Empty icon={Users} title="Not assigned yet" />}
          <ul className="divide-y divide-line">{rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <Link href={`/teacher/students/${a.student_id}?tab=challenges`} className="min-w-32 flex-1 font-medium hover:text-brand">{students.find((s) => s.id === a.student_id)?.full_name}<span className="block text-xs font-normal text-muted">{a.deadline ? `Due ${fmtDate(a.deadline)}` : "No deadline"}</span></Link>
              <QuickSelect label="Status" action={updateChallengeAssignment} input={{ id: a.id }} field="status" value={a.status} options={["not_started", "in_progress", "submitted", "completed"].map((k) => [k, STATUS[k].label])} />
              <ActionButton variant="ghost" size="icon" aria-label="Unassign" action={removeChallengeAssignment} input={{ id: a.id }} confirm="Unassign this student? Their submissions for this challenge are deleted."><Trash2 /></ActionButton>
            </li>))}</ul>
        </Card>
      </div>
    </>
  );
}
