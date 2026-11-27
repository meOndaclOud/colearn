"use server";
import { z } from "zod";
import { run, check, uuid, date } from "./shared";
import { lessonSchema } from "@/lib/schemas";
import { LEARNING_CATEGORIES } from "@/lib/constants";

export async function saveLesson(input: unknown) {
  return run("teacher", lessonSchema, input, async (d, { db }) => {
    const res = await db.rpc("save_lesson", { p: d });
    check(res);
    return res.data as string;
  });
}

export async function duplicateLesson(input: unknown) {
  return run("teacher", z.object({ id: uuid, template: z.boolean() }), input, async ({ id, template }, { db }) => {
    const src = await db.from("lessons").select("title, is_template").eq("id", id).single();
    check(src);
    const { title, is_template } = src.data!;
    const name = template ? title : is_template ? title : `${title} (copy)`;
    const res = await db.rpc("duplicate_lesson", { p_id: id, p_title: name, p_template: template });
    check(res);
    return res.data as string;
  });
}

export async function deleteLesson(input: unknown) {
  return run("teacher", z.object({ id: uuid }), input, async ({ id }, { db }) => { check(await db.from("lessons").delete().eq("id", id)); });
}

/** Assign one lesson to many students on many dates in one step. */
export async function scheduleLesson(input: unknown) {
  const schema = z.object({ lesson_id: uuid, student_ids: z.array(uuid).min(1, "Choose at least one student."),
    dates: z.array(date).min(1, "Choose at least one date.").max(60), status: z.enum(["draft","published"]) });
  return run("teacher", schema, input, async ({ lesson_id, student_ids, dates, status }, { db }) => {
    const rows = student_ids.flatMap((student_id) => dates.map((scheduled_date) => ({ lesson_id, student_id, scheduled_date, status })));
    check(await db.from("lesson_assignments").upsert(rows, { onConflict: "lesson_id,student_id,scheduled_date" }));
  });
}

/** Create a lesson from the teacher's assignment details and schedule it in one flow. */
export async function createAndScheduleLesson(input: unknown) {
  const schema = z.object({
    title: z.string().trim().min(2, "Enter a lesson title.").max(200),
    category: z.enum(LEARNING_CATEGORIES),
    instructions: z.string().trim().min(1, "Add specific instructions for the student.").max(20000),
    student_ids: z.array(uuid).min(1, "Choose at least one student."),
    dates: z.array(date).min(1, "Choose at least one date.").max(60),
    status: z.enum(["draft", "published"]),
  });
  return run("teacher", schema, input, async ({ title, category, instructions, student_ids, dates, status }, { db }) => {
    const subject = await db.from("subjects").upsert({ name: category, color: "indigo" }, { onConflict: "teacher_id,name" }).select("id").single();
    check(subject);
    const saved = await db.rpc("save_lesson", { p: {
      title, subject_id: subject.data!.id, objectives: "", introduction: "", instructions, materials: "", duration_minutes: 45,
      expected_outcome: "", completion_criteria: "", notes: "", is_template: false, resources: [], activities: [],
    } });
    check(saved);
    const lessonId = saved.data as string;
    const assigned = await db.from("lesson_assignments").upsert(
      student_ids.flatMap((student_id) => dates.map((scheduled_date) => ({ lesson_id: lessonId, student_id, scheduled_date, status }))),
      { onConflict: "lesson_id,student_id,scheduled_date" },
    );
    if (assigned.error) {
      await db.from("lessons").delete().eq("id", lessonId);
      check(assigned);
    }
    return lessonId;
  });
}

export async function updateAssignment(input: unknown) {
  const schema = z.object({ id: uuid, scheduled_date: date.optional(), status: z.enum(["draft","published"]).optional() });
  return run("teacher", schema, input, async ({ id, ...changes }, { db }) => { check(await db.from("lesson_assignments").update(changes).eq("id", id)); });
}

export async function publishRange(input: unknown) {
  return run("teacher", z.object({ from: date, to: date, student_id: uuid.nullable() }), input, async ({ from, to, student_id }, { db }) => {
    let q = db.from("lesson_assignments").update({ status: "published" }).eq("status", "draft").gte("scheduled_date", from).lte("scheduled_date", to);
    if (student_id) q = q.eq("student_id", student_id);
    check(await q);
  });
}

export async function removeAssignment(input: unknown) {
  return run("teacher", z.object({ id: uuid }), input, async ({ id }, { db }) => { check(await db.from("lesson_assignments").delete().eq("id", id)); });
}

export async function teacherSetActivity(input: unknown) {
  const schema = z.object({ assignment_id: uuid, activity_id: uuid, status: z.enum(["not_started","in_progress","awaiting_review","completed"]) });
  return run("teacher", schema, input, async (d, { db }) => {
    check(await db.rpc("teacher_set_activity", { p_assignment: d.assignment_id, p_activity: d.activity_id, p_status: d.status }));
  });
}
