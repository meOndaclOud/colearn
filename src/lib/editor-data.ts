import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { must, resourcesFor } from "./data";
import { getLibrary, getSubjects } from "./queries";
import type { Activity } from "./types";

export async function editorData(db: SupabaseClient, excludeLesson?: string) {
  const [subjects, library, recent] = await Promise.all([getSubjects(db), getLibrary(db),
    db.from("lessons").select("id, title, activities(*)").order("updated_at", { ascending: false }).limit(15)]);
  const lessons = must<{ id: string; title: string; activities: (Activity & { id: string; lesson_id: string; teacher_id: string; created_at: string })[] }[]>(recent).filter((l) => l.id !== excludeLesson && l.activities.length);
  const res = await resourcesFor(db, "activity_id", lessons.flatMap((l) => l.activities.map((a) => a.id)));
  const copySources = lessons.map((l) => ({
    lesson: l.title,
    activities: [...l.activities].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((a) => ({
      id: a.id, title: a.title, description: a.description, instructions: a.instructions, estimated_minutes: a.estimated_minutes, expected_result: a.expected_result,
      requires_submission: a.requires_submission, requires_review: a.requires_review, resources: (res[a.id] ?? []).map(({ id: _id, ...r }) => r),
    })),
  }));
  return { subjects, library, copySources };
}
