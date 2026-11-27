"use server";
import { z } from "zod";
import { run, check, uuid, date } from "./shared";
import { challengeSchema, projectSchema, librarySchema } from "@/lib/schemas";
import { LEARNING_CATEGORIES } from "@/lib/constants";

export async function saveChallenge(input: unknown) {
  return run("teacher", challengeSchema, input, async ({ id, resources, ...c }, { db }) => {
    const res = id ? await db.from("challenges").update(c).eq("id", id).select("id").single() : await db.from("challenges").insert(c).select("id").single();
    check(res);
    check(await db.rpc("set_resources", { p_col: "challenge_id", p_id: res.data!.id, p_items: resources }));
    return res.data!.id as string;
  });
}
export async function deleteChallenge(input: unknown) {
  return run("teacher", z.object({ id: uuid }), input, async ({ id }, { db }) => { check(await db.from("challenges").delete().eq("id", id)); });
}
export async function assignChallenge(input: unknown) {
  const schema = z.object({ challenge_id: uuid, student_ids: z.array(uuid).min(1, "Choose at least one student."), deadline: date.nullable() });
  return run("teacher", schema, input, async ({ challenge_id, student_ids, deadline }, { db }) => {
    // existing assignments keep their progress; only the deadline changes
    check(await db.from("challenge_assignments").upsert(student_ids.map((student_id) => ({ challenge_id, student_id, deadline })), { onConflict: "challenge_id,student_id" }));
  });
}
export async function createAndAssignChallenge(input: unknown) {
  const schema = z.object({
    title: z.string().trim().min(2, "Enter a challenge title.").max(200),
    category: z.enum(LEARNING_CATEGORIES),
    instructions: z.string().trim().min(1, "Add specific challenge instructions.").max(20000),
    student_ids: z.array(uuid).min(1, "Choose at least one student."),
    deadline: date.nullable(),
  });
  return run("teacher", schema, input, async ({ title, category, instructions, student_ids, deadline }, { db }) => {
    const created = await db.from("challenges").insert({
      title, category, instructions, difficulty: "beginner", description: "", objective: "", required_resources: "", expected_outcome: "", submission_requirements: "",
    }).select("id").single();
    check(created);
    const challengeId = created.data!.id as string;
    const assigned = await db.from("challenge_assignments").upsert(
      student_ids.map((student_id) => ({ challenge_id: challengeId, student_id, deadline })),
      { onConflict: "challenge_id,student_id" },
    );
    if (assigned.error) {
      await db.from("challenges").delete().eq("id", challengeId);
      check(assigned);
    }
    return challengeId;
  });
}
export async function updateChallengeAssignment(input: unknown) {
  const schema = z.object({ id: uuid, status: z.enum(["not_started","in_progress","submitted","completed"]) });
  return run("teacher", schema, input, async ({ id, status }, { db }) => {
    check(await db.from("challenge_assignments").update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", id));
  });
}
export async function removeChallengeAssignment(input: unknown) {
  return run("teacher", z.object({ id: uuid }), input, async ({ id }, { db }) => { check(await db.from("challenge_assignments").delete().eq("id", id)); });
}

export async function saveProject(input: unknown) {
  return run("teacher", projectSchema, input, async ({ id, resources, student_ids, ...p }, { db }) => {
    const res = id ? await db.from("projects").update(p).eq("id", id).select("id").single() : await db.from("projects").insert(p).select("id").single();
    check(res);
    const pid = res.data!.id as string;
    check(await db.rpc("set_resources", { p_col: "project_id", p_id: pid, p_items: resources }));
    check(await db.from("project_assignments").delete().eq("project_id", pid).not("student_id", "in", `(${student_ids.join(",")})`));
    check(await db.from("project_assignments").upsert(student_ids.map((student_id) => ({ project_id: pid, student_id })), { onConflict: "project_id,student_id" }));
    return pid;
  });
}
export async function deleteProject(input: unknown) {
  return run("teacher", z.object({ id: uuid }), input, async ({ id }, { db }) => { check(await db.from("projects").delete().eq("id", id)); });
}

export async function reviewSubmission(input: unknown) {
  const schema = z.object({ id: uuid, status: z.enum(["approved","needs_revision","resubmit"]), feedback: z.string().max(4000) });
  return run("teacher", schema, input, async (d, { db }) => {
    check(await db.rpc("review_submission", { p_id: d.id, p_status: d.status, p_feedback: d.feedback }));
  });
}

export async function saveLibraryItem(input: unknown) {
  return run("teacher", librarySchema, input, async ({ id, ...r }, { db, profile }) => {
    if (r.file_path && !r.file_path.startsWith(`${profile.id}/`)) throw new Error("Invalid file.");
    check(id ? await db.from("resource_library").update(r).eq("id", id) : await db.from("resource_library").insert(r));
  });
}
export async function deleteLibraryItem(input: unknown) {
  return run("teacher", z.object({ id: uuid }), input, async ({ id }, { db }) => {
    // the stored file is kept: lessons that reused it still point to it
    check(await db.from("resource_library").delete().eq("id", id));
  });
}
