import Link from "next/link";
import { Trophy } from "lucide-react";
import { requireTeacher } from "@/lib/auth";
import { must } from "@/lib/data";
import { getLibrary } from "@/lib/queries";
import { CATEGORIES } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Badge, Empty, PageHeader } from "@/components/shared/bits";
import { SearchList } from "@/components/shared/search-list";
import { ChallengeDialog } from "@/components/teacher/forms";
import type { Challenge } from "@/lib/types";

export const metadata = { title: "Challenge Centre" };

export default async function Challenges() {
  const { db, profile } = await requireTeacher();
  const [res, library] = await Promise.all([db.from("challenges").select("*, challenge_assignments(status)").order("created_at", { ascending: false }), getLibrary(db)]);
  const rows = must<(Challenge & { challenge_assignments: { status: string }[] })[]>(res);
  return (
    <>
      <PageHeader title="Challenge Centre" subtitle="Extra learning activities, separate from daily lessons."><ChallengeDialog teacherId={profile.id} library={library} /></PageHeader>
      {!rows.length ? <Empty icon={Trophy} title="No challenges yet" /> : (
        <SearchList placeholder="Search challenges" filter={{ label: "All categories", options: [...new Set([...CATEGORIES, ...rows.map((r) => r.category)])] }} items={rows.map((c) => ({
          key: c.id, text: `${c.title} ${c.category} ${c.difficulty} ${c.description}`, tags: [c.category],
          node: (
            <Link href={`/teacher/challenges/${c.id}`}><Card className="h-full transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex flex-wrap gap-1.5"><Badge tone="blue">{c.category}</Badge><Badge>{c.difficulty}</Badge></div>
              <p className="mt-3 font-semibold">{c.title}</p><p className="mt-1 line-clamp-2 text-sm text-muted">{c.description}</p>
              <p className="mt-3 text-xs text-muted">{c.challenge_assignments.length} assigned · {c.challenge_assignments.filter((a) => a.status === "completed").length} completed</p>
            </Card></Link>),
        }))} />
      )}
    </>
  );
}
