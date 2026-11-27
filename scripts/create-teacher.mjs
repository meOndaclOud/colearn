// Usage: npm run create-teacher -- <username-or-email> "<Full Name>" [timezone]
// The password is read from the TEACHER_PASSWORD environment variable, or asked for.
import { createInterface } from "node:readline/promises";
import { createTeacher, admin, ok } from "./lib.mjs";

const [username, name, timezone = "Asia/Yangon"] = process.argv.slice(2);
if (!username || !name) { console.error('Usage: npm run create-teacher -- <username> "<Full Name>" [timezone]'); process.exit(1); }
let password = process.env.TEACHER_PASSWORD;
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question("Choose a password (8+ characters): ");
  rl.close();
}
if (password.length < 8) { console.error("Password must be at least 8 characters."); process.exit(1); }
const user = await createTeacher({ username, password, name, timezone });
ok(await admin.from("subjects").insert(["Coding", "Design", "Digital Skills", "Creative Thinking", "Typing"].map((n) => ({ teacher_id: user.id, name: n }))));
console.log(`Teacher "${username}" created. Sign in, then create the class login in Settings.`);
