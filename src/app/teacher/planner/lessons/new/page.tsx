import { requireTeacher } from "@/lib/auth";
import { editorData } from "@/lib/editor-data";
import { PageHeader } from "@/components/shared/bits";
import { LessonEditor } from "@/components/editor/lesson-editor";

export const metadata = { title: "New lesson" };

export default async function NewLesson() {
  const { db, profile } = await requireTeacher();
  const data = await editorData(db);
  return (
    <>
      <PageHeader back={{ href: "/teacher/planner", label: "Lesson Planner" }} title="New lesson" subtitle="Save first, then schedule it for students." />
      <LessonEditor {...data} teacherId={profile.id} initial={{ title: "", subject_id: "", objectives: "", introduction: "", instructions: "", materials: "", duration_minutes: 45,
        expected_outcome: "", completion_criteria: "", notes: "", is_template: false, resources: [], activities: [] }} />
    </>
  );
}
