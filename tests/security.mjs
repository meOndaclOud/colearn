// Permission tests against a real Supabase project that has the demo data loaded.
// Run: DEMO_PASSWORD=... npm run test:security   (use a test project: it writes data; re-seed afterwards)
import assert from "node:assert/strict";
import { admin, client, ok, signIn, email, createTeacher } from "../scripts/lib.mjs";

const PASSWORD = process.env.DEMO_PASSWORD;
if (!PASSWORD) { console.error("Set DEMO_PASSWORD to the password printed by seed:demo."); process.exit(1); }
let passed = 0, failed = 0;
const test = async (name, fn) => {
  try { await fn(); passed++; console.log("  ok   " + name); }
  catch (e) { failed++; console.log("  FAIL " + name + "\n       " + e.message); }
};
const denied = (r) => assert.ok(r.error, "expected an error, but it succeeded");
const nothing = (r) => assert.ok(r.error || !r.data?.length, `expected no rows, got ${r.data?.length}`);

const t = await signIn("demo-teacher", PASSWORD), k = await signIn("demo-class", PASSWORD), anon = client();
const teacherId = (await t.auth.getUser()).data.user.id;
const students = ok(await t.from("students").select("*").order("full_name"));
const [a, b] = students;
const today = ok(await t.rpc("app_today", { t: teacherId }));
const all = ok(await t.from("lesson_assignments").select("*"));
const draft = all.find((x) => x.status === "draft"), future = all.find((x) => x.status === "published" && x.scheduled_date > today);

console.log("Signed out");
await test("cannot read any table", async () => {
  for (const table of ["students", "lessons", "activities", "submissions", "teacher_feedback", "profiles", "resource_library"]) nothing(await anon.from(table).select("*"));
});
await test("cannot call write functions", async () => denied(await anon.rpc("student_set_activity", { p_student: a.id, p_assignment: all[0].id, p_activity: a.id, p_status: "completed" })));

console.log("Class login: reading");
await test("cannot see teacher notes, lesson notes, library or private observations", async () => {
  for (const table of ["student_notes", "lesson_notes", "resource_library"]) nothing(await k.from(table).select("*"));
  assert.ok(ok(await t.from("teacher_feedback").select("*").eq("kind", "observation")).length);
  nothing(await k.from("teacher_feedback").select("*").eq("kind", "observation"));
});
await test("cannot see drafts or future lessons", async () => {
  const seen = ok(await k.from("lesson_assignments").select("*"));
  assert.ok(seen.length && seen.every((x) => x.status === "published" && x.scheduled_date <= today));
  assert.ok(draft && future);
  nothing(await k.from("lesson_assignments").select("*").in("id", [draft.id, future.id]));
  nothing(await k.from("assignment_progress").select("*").in("assignment_id", [draft.id, future.id]));
});
await test("cannot read a lesson that is only scheduled as draft", async () => {
  const released = new Set(all.filter((x) => x.status === "published" && x.scheduled_date <= today).map((x) => x.lesson_id));
  const hidden = ok(await t.from("lessons").select("id")).map((l) => l.id).filter((id) => !released.has(id));
  if (hidden.length) { nothing(await k.from("lessons").select("*").in("id", hidden)); nothing(await k.from("activities").select("*").in("lesson_id", hidden)); }
});

console.log("Class login: writing");
const lesson = ok(await k.from("lessons").select("*").limit(1))[0];
await test("cannot create, edit or delete teaching content", async () => {
  denied(await k.from("lessons").insert({ title: "x", teacher_id: teacherId }));
  nothing(await k.from("lessons").update({ title: "hacked" }).eq("id", lesson.id).select());
  nothing(await k.from("lessons").delete().eq("id", lesson.id).select());
  denied(await k.rpc("save_lesson", { p: { title: "x" } }));
  denied(await k.rpc("duplicate_lesson", { p_id: lesson.id, p_title: "x", p_template: false }));
  nothing(await k.from("students").update({ full_name: "x" }).eq("id", a.id).select());
});
await test("cannot write progress, submissions or feedback directly", async () => {
  const row = ok(await k.from("progress_records").select("*").limit(1))[0];
  nothing(await k.from("progress_records").update({ status: "completed" }).eq("id", row.id).select());
  denied(await k.from("teacher_feedback").insert({ teacher_id: teacherId, student_id: a.id, body: "x" }));
  denied(await k.from("submissions").insert({ teacher_id: teacherId, student_id: a.id, title: "x", project_id: lesson.id, link_url: "https://x.test" }));
});
await test("cannot become a teacher", async () => {
  const me = (await k.auth.getUser()).data.user.id;
  nothing(await k.from("profiles").update({ role: "teacher" }).eq("id", me).select());
  await k.auth.updateUser({ data: { role: "teacher" } });
  assert.equal(ok(await k.from("profiles").select("role").eq("id", me).single()).role, "class");
});
await test("cannot use teacher functions", async () => {
  const s = ok(await k.from("submissions").select("*").eq("status", "submitted").limit(1))[0];
  denied(await k.rpc("review_submission", { p_id: s.id, p_status: "approved", p_feedback: "" }));
  denied(await k.rpc("teacher_set_activity", { p_assignment: all[0].id, p_activity: lesson.id, p_status: "completed" }));
  denied(await k.rpc("put_progress", { a: all[0], act: lesson.id, s: "completed" }));
});
await test("cannot touch a draft or future lesson through the student function", async () => {
  for (const x of [draft, future]) {
    const act = ok(await t.from("activities").select("id").eq("lesson_id", x.lesson_id).limit(1))[0];
    denied(await k.rpc("student_set_activity", { p_student: x.student_id, p_assignment: x.id, p_activity: act.id, p_status: "completed" }));
  }
});

console.log("Review rules");
const story = ok(await t.from("lessons").select("id").eq("title", "Scratch storytelling").single());
const share = ok(await t.from("activities").select("*").eq("lesson_id", story.id).eq("position", 2).single());
const mine = all.find((x) => x.lesson_id === story.id && x.status === "published" && x.scheduled_date === today);
const args = { p_student: mine.student_id, p_assignment: mine.id, p_activity: share.id };
const send = { p_student: mine.student_id, p_type: "activity", p_target: share.id, p_assignment: mine.id, p_link: "https://scratch.mit.edu/", p_file_path: null, p_file_name: null, p_comment: "" };
await test("work must be submitted before completion", async () => denied(await k.rpc("student_set_activity", { ...args, p_status: "completed" })));
await test("duplicate submissions are blocked", async () => { ok(await k.rpc("student_submit", send)); denied(await k.rpc("student_submit", send)); });
await test("reviewed activity waits for the teacher", async () => assert.equal(ok(await k.rpc("student_set_activity", { ...args, p_status: "completed" })), "awaiting_review"));
await test("approval completes it, and the student cannot undo that", async () => {
  const s = ok(await t.from("submissions").select("id").eq("activity_id", share.id).eq("status", "submitted").single());
  ok(await t.rpc("review_submission", { p_id: s.id, p_status: "approved", p_feedback: "Great" }));
  assert.equal(ok(await t.from("progress_records").select("status").eq("assignment_id", mine.id).eq("activity_id", share.id).single()).status, "completed");
  denied(await k.rpc("student_set_activity", { ...args, p_status: "not_started" }));
});
await test("every change is kept in history", async () => assert.ok(ok(await t.from("progress_history").select("id").eq("student_id", mine.student_id)).length >= 3));

console.log("Files");
const file = new Blob(["hello"], { type: "text/plain" });
const path = `${teacherId}/${a.id}/test/${today}/${crypto.randomUUID()}-work.txt`;
await test("class can upload work and the teacher can download it", async () => {
  ok(await k.storage.from("submissions").upload(path, file));
  assert.equal(await ok(await t.storage.from("submissions").download(path)).text(), "hello");
});
await test("class cannot overwrite or delete uploaded work", async () => {
  denied(await k.storage.from("submissions").upload(path, file, { upsert: true }));
  await k.storage.from("submissions").remove([path]);
  ok(await t.storage.from("submissions").download(path));
});
await test("another student's file cannot be attached to a submission", async () => {
  const project = ok(await k.from("projects").select("id").limit(1))[0];
  denied(await k.rpc("student_submit", { p_student: b.id, p_type: "project", p_target: project.id, p_assignment: null, p_link: null, p_file_path: path, p_file_name: "x", p_comment: "" }));
});
await test("class cannot upload teaching files, and only reads attached ones", async () => {
  denied(await k.storage.from("resources").upload(`${teacherId}/x.txt`, file));
  const secret = `${teacherId}/${crypto.randomUUID()}-answers.txt`;
  ok(await t.storage.from("resources").upload(secret, file));
  denied(await k.storage.from("resources").download(secret));
  const draftOnly = ok(await t.from("lessons").insert({ title: "Unreleased" }).select().single());
  ok(await t.from("activity_resources").insert({ lesson_id: draftOnly.id, label: "x", file_path: secret }));
  denied(await k.storage.from("resources").download(secret));
  const released = ok(await k.from("lessons").select("id").limit(1))[0];
  ok(await t.from("activity_resources").insert({ lesson_id: released.id, label: "x", file_path: secret }));
  ok(await k.storage.from("resources").download(secret));
});
await test("deactivated students disappear from the class login", async () => {
  ok(await t.from("students").update({ is_active: false }).eq("id", b.id));
  nothing(await k.from("students").select("*").eq("id", b.id));
  nothing(await k.from("lesson_assignments").select("*").eq("student_id", b.id));
  nothing(await k.from("submissions").select("*").eq("student_id", b.id));
  ok(await t.from("students").update({ is_active: true }).eq("id", b.id));
});

console.log("Another teacher");
const other = await createTeacher({ username: "security-test-teacher", password: PASSWORD, name: "Other", timezone: "UTC" });
const cls = ok(await admin.auth.admin.createUser({ email: email("security-test-class"), password: PASSWORD, email_confirm: true, app_metadata: { role: "class", teacher_id: other.id } })).user;
const o = await signIn("security-test-teacher", PASSWORD), ok2 = await signIn("security-test-class", PASSWORD);
try {
  await test("sees none of the first teacher's data", async () => {
    for (const c of [o, ok2]) for (const table of ["students", "lessons", "submissions", "teacher_feedback", "progress_records", "resource_library"]) nothing(await c.from(table).select("*"));
    denied(await o.storage.from("submissions").download(path));
  });
  await test("cannot attach to or assign the first teacher's records", async () => {
    denied(await o.from("lesson_assignments").insert({ lesson_id: lesson.id, student_id: a.id, scheduled_date: today }));
    denied(await o.from("activity_resources").insert({ lesson_id: lesson.id, label: "x", url: "https://x.test" }));
  });
  await test("cannot open their files by copying the path into own lesson", async () => {
    const attached = ok(await t.from("activity_resources").select("file_path").not("file_path", "is", null).limit(1))[0].file_path;
    const st = ok(await o.from("students").insert({ full_name: "Z Z", username: "zz" }).select().single());
    const l = ok(await o.from("lessons").insert({ title: "copy" }).select().single());
    ok(await o.from("lesson_assignments").insert({ lesson_id: l.id, student_id: st.id, scheduled_date: "2000-01-01", status: "published" }));
    ok(await o.from("activity_resources").insert({ lesson_id: l.id, label: "x", file_path: attached }));
    denied(await ok2.storage.from("resources").download(attached));
  });
} finally {
  await admin.auth.admin.deleteUser(cls.id);
  await admin.auth.admin.deleteUser(other.id);
}
await test("a self-made account without a server-set role has no access", async () => {
  const u = ok(await admin.auth.admin.createUser({ email: email("security-test-nobody"), password: PASSWORD, email_confirm: true, user_metadata: { role: "teacher" } })).user;
  const c = await signIn("security-test-nobody", PASSWORD);
  nothing(await c.from("profiles").select("*"));
  denied(await c.from("students").insert({ full_name: "x", username: "x" }));
  await admin.auth.admin.deleteUser(u.id);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
