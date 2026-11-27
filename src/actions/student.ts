"use server";
import { z } from "zod";
import { cookies } from "next/headers";
import { run, check, uuid, url } from "./shared";
import { STUDENT_COOKIE } from "@/lib/auth";

async function me() {
  const id = (await cookies()).get(STUDENT_COOKIE)?.value;
  if (!id) throw new Error("Choose your name again.");
  return id;
}

export async function startLesson(input: unknown) {
  return run("class", z.object({ assignment_id: uuid }), input, async ({ assignment_id }, { db }) => {
    check(await db.rpc("student_start_lesson", { p_assignment: assignment_id, p_student: await me() }));
  });
}

export async function completeLesson(input: unknown) {
  return run("class", z.object({ assignment_id: uuid }), input, async ({ assignment_id }, { db }) => {
    const res = await db.rpc("student_complete_lesson", { p_assignment: assignment_id, p_student: await me() });
    check(res);
    return res.data as string;
  });
}

export async function setActivityStatus(input: unknown) {
  const schema = z.object({ assignment_id: uuid, activity_id: uuid, status: z.enum(["not_started","in_progress","completed"]) });
  return run("class", schema, input, async (d, { db }) => {
    const res = await db.rpc("student_set_activity", { p_student: await me(), p_assignment: d.assignment_id, p_activity: d.activity_id, p_status: d.status });
    check(res);
    return res.data as string;
  });
}

export async function startChallenge(input: unknown) {
  return run("class", z.object({ id: uuid }), input, async ({ id }, { db }) => {
    check(await db.rpc("student_start_challenge", { p_student: await me(), p_id: id }));
  });
}

export async function submitWork(input: unknown) {
  const schema = z.object({ type: z.enum(["activity","challenge","project"]), target: uuid, assignment_id: uuid.nullable(),
    link: url.nullable(), file_path: z.string().max(500).nullable(), file_name: z.string().max(200).nullable(), comment: z.string().max(4000) })
    .refine((d) => d.link || d.file_path, "Add a link or choose a file.");
  return run("class", schema, input, async (d, { db }) => {
    check(await db.rpc("student_submit", { p_student: await me(), p_type: d.type, p_target: d.target, p_assignment: d.assignment_id,
      p_link: d.link, p_file_path: d.file_path, p_file_name: d.file_name, p_comment: d.comment }));
  });
}
