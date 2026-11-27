"use server";
import { z } from "zod";
import { run, check, uuid } from "./shared";
import { studentSchema } from "@/lib/schemas";

export async function saveStudent(input: unknown) {
  return run("teacher", studentSchema, input, async ({ id, notes, subject_ids, ...s }, { db, profile }) => {
    if (s.avatar_path && !s.avatar_path.startsWith(`${profile.id}/`)) throw new Error("Invalid image.");
    const res = id ? await db.from("students").update(s).eq("id", id).select("id").single()
      : await db.from("students").insert(s).select("id").single();
    if (res.error?.code === "23505") throw new Error("Another student already uses that username.");
    check(res);
    const sid = res.data!.id as string;
    check(await db.from("student_notes").upsert({ student_id: sid, notes }));
    check(await db.from("student_subjects").delete().eq("student_id", sid));
    if (subject_ids.length) check(await db.from("student_subjects").insert(subject_ids.map((subject_id) => ({ student_id: sid, subject_id }))));
    return sid;
  });
}

export async function setStudentActive(input: unknown) {
  return run("teacher", z.object({ id: uuid, active: z.boolean() }), input, async ({ id, active }, { db }) => {
    check(await db.from("students").update({ is_active: active }).eq("id", id));
  });
}

export async function deleteStudent(input: unknown) {
  return run("teacher", z.object({ id: uuid }), input, async ({ id }, { db }) => {
    // remove the student's uploaded work as well as their records
    const files = await db.from("submissions").select("file_path").eq("student_id", id).not("file_path", "is", null);
    check(files);
    const paths = (files.data ?? []).map((f) => f.file_path as string);
    if (paths.length) check(await db.storage.from("submissions").remove(paths));
    check(await db.from("students").delete().eq("id", id));
  });
}

export async function addFeedback(input: unknown) {
  const schema = z.object({ student_id: uuid, kind: z.enum(["feedback","observation","achievement"]), body: z.string().trim().min(1, "Write something first.").max(4000),
    assignment_id: uuid.nullish(), activity_id: uuid.nullish() });
  return run("teacher", schema, input, async (d, { db }) => { check(await db.from("teacher_feedback").insert(d)); });
}

export async function deleteFeedback(input: unknown) {
  return run("teacher", z.object({ id: uuid }), input, async ({ id }, { db }) => { check(await db.from("teacher_feedback").delete().eq("id", id)); });
}
