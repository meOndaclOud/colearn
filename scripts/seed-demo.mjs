// Loads a separate demo workspace. Real accounts are never touched.
//   npm run seed:demo            create (replaces an earlier demo)
//   npm run seed:demo -- --remove
import { admin, ok, signIn, email, createTeacher } from "./lib.mjs";
import { randomBytes } from "node:crypto";

const TZ = process.env.DEMO_TIMEZONE || "Asia/Yangon";
const PASSWORD = process.env.DEMO_PASSWORD || randomBytes(9).toString("base64url");

async function remove() {
  const demos = ok(await admin.from("profiles").select("id, role, teacher_id").eq("is_demo", true).eq("role", "teacher"));
  for (const t of demos) {
    for (const bucket of ["submissions", "resources", "avatars"]) await emptyFolder(bucket, t.id);
    const cls = ok(await admin.from("profiles").select("id").eq("teacher_id", t.id).eq("role", "class"));
    for (const u of [...cls, t]) ok(await admin.auth.admin.deleteUser(u.id));
  }
  return demos.length;
}
async function emptyFolder(bucket, prefix) {
  const items = ok(await admin.storage.from(bucket).list(prefix, { limit: 1000 }));
  const files = [];
  for (const i of items) i.id ? files.push(`${prefix}/${i.name}`) : await emptyFolder(bucket, `${prefix}/${i.name}`);
  if (files.length) ok(await admin.storage.from(bucket).remove(files));
}

const removed = await remove();
if (process.argv.includes("--remove")) { console.log(`Removed ${removed} demo workspace(s).`); process.exit(0); }

const teacher = await createTeacher({ username: "demo-teacher", password: PASSWORD, name: "Ms. Thandar (Demo)", timezone: TZ, demo: true });
ok(await admin.auth.admin.createUser({ email: email("demo-class"), password: PASSWORD, email_confirm: true,
  app_metadata: { role: "class", teacher_id: teacher.id, username: "demo-class", is_demo: true } }));
const t = await signIn("demo-teacher", PASSWORD);

const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const day = (n) => new Date(Date.parse(today) + n * 86400000).toISOString().slice(0, 10);

const subjects = Object.fromEntries(ok(await t.from("subjects").insert(
  ["Coding", "Design", "Digital Skills", "Creative Thinking", "Typing"].map((name) => ({ name }))).select()).map((s) => [s.name, s.id]));
const students = ok(await t.from("students").insert([
  { full_name: "Aung Min", username: "aung.min", age: 10, grade: "Grade 5", interests: ["Stories", "Games"], avatar_color: "indigo" },
  { full_name: "Hnin Wai", username: "hnin.wai", age: 12, grade: "Grade 7", interests: ["Drawing", "Architecture"], avatar_color: "teal" },
  { full_name: "Kyaw Zin", username: "kyaw.zin", age: 15, grade: "Grade 10", interests: ["Web animation", "Puzzles"], avatar_color: "violet" },
]).select());
const [a, b, c] = students;
ok(await t.from("student_subjects").insert([[a, "Coding"], [a, "Creative Thinking"], [a, "Typing"], [b, "Design"], [b, "Digital Skills"], [c, "Coding"], [c, "Creative Thinking"]]
  .map(([s, n]) => ({ student_id: s.id, subject_id: subjects[n] }))));
ok(await t.from("student_notes").insert([{ student_id: a.id, notes: "Works best with short, clear steps." }, { student_id: b.id, notes: "Strong visual thinker. Encourage planning on paper first." }, { student_id: c.id, notes: "Ready for harder challenges." }]));

const link = (label, url, action = "open") => ({ label, url, action, file_path: null });
const library = [
  { title: "Scratch editor", kind: "website", url: "https://scratch.mit.edu/projects/editor/", category: "Coding", tags: ["scratch"] },
  { title: "Tinkercad", kind: "website", url: "https://www.tinkercad.com/", category: "Design", tags: ["3d"] },
  { title: "Typing practice", kind: "website", url: "https://www.typingclub.com/", category: "Typing", tags: ["keyboard"] },
  { title: "MDN: JavaScript guide", kind: "website", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide", category: "Coding", tags: ["javascript"] },
];
ok(await t.from("resource_library").insert(library));

const act = (title, minutes, steps, extra = {}) => ({ title, description: "", estimated_minutes: minutes, instructions: `<ol>${steps.map((s) => `<li><p>${s}</p></li>`).join("")}</ol>`,
  expected_result: "", requires_submission: false, requires_review: false, resources: [], ...extra });
async function lesson(title, subject, intro, objectives, activities) {
  return ok(await t.rpc("save_lesson", { p: { title, subject_id: subjects[subject], introduction: `<p>${intro}</p>`, objectives, instructions: "<p>Work through the activities in order. Ask for help if you are stuck for more than five minutes.</p>",
    materials: "Computer with internet", duration_minutes: activities.reduce((n, x) => n + x.estimated_minutes, 0), expected_outcome: "Every activity finished.", completion_criteria: "All activities marked completed.", notes: "Demo lesson.", resources: [], activities } }));
}
const assign = async (lesson_id, student, offset, status = "published") =>
  ok(await t.from("lesson_assignments").insert({ lesson_id, student_id: student.id, scheduled_date: day(offset), status }).select().single());

const L = {
  story: await lesson("Scratch storytelling", "Coding", "Today you will tell a short story with two characters.", "Use sprites, backdrops and messages to tell a story.", [
    act("Plan your story", 10, ["Choose two characters.", "Write what happens at the start, middle and end."]),
    act("Build the first scene", 25, ["Open Scratch.", "Add a backdrop and two sprites.", "Make them speak using <strong>say</strong> blocks."], { resources: [link("Scratch editor", library[0].url, "start")] }),
    act("Share your project", 10, ["Save and share your project.", "Send the project link to your teacher."], { requires_submission: true, requires_review: true, expected_result: "A link to your Scratch project." })]),
  think: await lesson("Creative problem solving", "Creative Thinking", "Practise finding more than one answer to a problem.", "Generate and compare several solutions.", [
    act("Ten uses for a paper cup", 10, ["Set a timer.", "List ten different uses."]), act("Pick your best idea", 10, ["Choose one idea and draw it."])]),
  typing: await lesson("Typing practice: home row", "Typing", "Build speed without looking at the keys.", "Type the home row with correct fingers.", [
    act("Warm up", 5, ["Place your fingers on A S D F and J K L ;"]), act("Practice session", 15, ["Complete two lessons.", "Note your words per minute."], { resources: [link("Typing practice", library[2].url, "start")] })]),
  house: await lesson("Tinkercad: design a 3D house", "Design", "Design a small house you would like to live in.", "Combine and resize 3D shapes accurately.", [
    act("Learn the controls", 10, ["Move, rotate and resize a box."], { resources: [link("Tinkercad", library[1].url, "start")] }),
    act("Build walls and roof", 25, ["Make four walls.", "Add a roof shape on top."]),
    act("Add doors and windows", 15, ["Use hole shapes to cut openings.", "Submit a link or screenshot."], { requires_submission: true, requires_review: true })]),
  mouse: await lesson("Mouse drawing and digital creativity", "Digital Skills", "Improve mouse control while making a picture.", "Draw smooth shapes with a mouse.", [
    act("Trace shapes", 10, ["Draw ten circles and ten squares."]), act("Make a poster", 25, ["Draw a poster about your favourite place."], { requires_submission: true })]),
  anim: await lesson("JavaScript animation", "Coding", "Make a ball move and bounce on a canvas.", "Use requestAnimationFrame to animate.", [
    act("Draw a ball", 15, ["Create a canvas element.", "Draw a circle."], { resources: [link("JavaScript guide", library[3].url, "doc")] }),
    act("Make it bounce", 25, ["Update the position every frame.", "Reverse direction at the edges."]),
    act("Submit your code", 5, ["Share a link to your project."], { requires_submission: true, requires_review: true })]),
  basics: await lesson("Programming fundamentals: loops", "Coding", "Loops repeat work so you do not have to.", "Write for and while loops.", [
    act("Predict the output", 10, ["Read three loops and write what they print."]), act("Write your own", 20, ["Print the 7 times table."])]),
};

const made = {
  a0: await assign(L.story, a, 0), a1: await assign(L.typing, a, 0), a2: await assign(L.think, a, -1), a3: await assign(L.think, a, 2),
  b0: await assign(L.house, b, 0), b1: await assign(L.mouse, b, -1), b2: await assign(L.mouse, b, 1),
  c0: await assign(L.anim, c, 0), c1: await assign(L.basics, c, -2),
};
await assign(L.house, a, 3, "draft");
await assign(L.basics, c, 4, "draft");

const challenge = async (row, resources, student, deadline) => {
  const ch = ok(await t.from("challenges").insert(row).select().single());
  ok(await t.rpc("set_resources", { p_col: "challenge_id", p_id: ch.id, p_items: resources }));
  return ok(await t.from("challenge_assignments").insert({ challenge_id: ch.id, student_id: student.id, deadline: day(deadline) }).select().single());
};
const ch1 = await challenge({ title: "Build a catching game", category: "Scratch Projects", difficulty: "beginner", description: "Catch falling objects and keep score.", objective: "Use variables and collisions.", instructions: "<ul><li><p>Make a basket follow the mouse.</p></li><li><p>Add one point for each catch.</p></li></ul>", submission_requirements: "A shared Scratch link.", expected_outcome: "A playable game with a score." }, [link("Scratch editor", library[0].url, "start")], a, 5);
await challenge({ title: "Design a name keychain", category: "Tinkercad 3D Design", difficulty: "intermediate", description: "Model a keychain with your name.", objective: "Combine text and shapes.", instructions: "<p>Keep it under 60 mm long.</p>", submission_requirements: "A Tinkercad link or screenshot." }, [link("Tinkercad", library[1].url, "start")], b, 7);
await challenge({ title: "Logic puzzle: FizzBuzz", category: "JavaScript Challenges", difficulty: "intermediate", description: "A classic logic test.", objective: "Combine loops and conditions.", instructions: "<p>Print 1 to 100, replacing multiples of 3 with Fizz and 5 with Buzz.</p>", submission_requirements: "A link or your .js file." }, [], c, 3);

const project = ok(await t.from("projects").insert({ title: "My term showcase", instructions: "<p>Collect your best piece of work and describe what you learned.</p>", due_date: day(14) }).select().single());
ok(await t.from("project_assignments").insert(students.map((s) => ({ project_id: project.id, student_id: s.id }))));
ok(await t.rpc("set_resources", { p_col: "project_id", p_id: project.id, p_items: [link("How to share a Google Drive file", "https://support.google.com/drive/answer/2494822", "open")] }));

// pupil activity goes through the same functions the app uses
const k = await signIn("demo-class", PASSWORD);
const acts = async (lessonId) => ok(await t.from("activities").select("id").eq("lesson_id", lessonId).order("position"));
const set = async (s, as, activity, status) => ok(await k.rpc("student_set_activity", { p_student: s.id, p_assignment: as.id, p_activity: activity.id, p_status: status }));
const submit = async (s, type, target, assignment, url, comment) => ok(await k.rpc("student_submit", { p_student: s.id, p_type: type, p_target: target, p_assignment: assignment, p_link: url, p_file_path: null, p_file_name: null, p_comment: comment }));

const story = await acts(L.story), typing = await acts(L.typing), think = await acts(L.think), house = await acts(L.house), anim = await acts(L.anim), basics = await acts(L.basics);
await set(a, made.a0, story[0], "completed"); await set(a, made.a0, story[1], "in_progress");
for (const x of think) await set(a, made.a2, x, "completed");
await set(a, made.a1, typing[0], "completed");
await set(b, made.b0, house[0], "completed"); await set(b, made.b0, house[1], "completed");
await submit(b, "activity", house[2].id, made.b0.id, "https://www.tinkercad.com/", "My house has a round window.");
for (const x of basics) await set(c, made.c1, x, "completed");
await set(c, made.c0, anim[0], "completed");
await submit(c, "project", project.id, null, "https://developer.mozilla.org/", "Draft of my showcase.");
await submit(a, "challenge", ch1.id, null, "https://scratch.mit.edu/", "The basket moves with the mouse.");

const sub = ok(await t.from("submissions").select("id").eq("student_id", c.id).single());
ok(await t.rpc("review_submission", { p_id: sub.id, p_status: "needs_revision", p_feedback: "Good start. Add two sentences about what you learned." }));
ok(await t.from("teacher_feedback").insert([
  { student_id: a.id, kind: "feedback", body: "Lovely story plan. Try adding a second backdrop." },
  { student_id: a.id, kind: "observation", body: "Stayed focused for the whole session." },
  { student_id: b.id, kind: "achievement", body: "Finished her first 3D walls without help!" },
  { student_id: c.id, kind: "achievement", body: "Completed the loops lesson ahead of time." },
]));

console.log(`Demo workspace ready (timezone ${TZ}).
  Teacher login: demo-teacher
  Class login:   demo-class
  Password:      ${PASSWORD}`);
