import { createClient } from "@supabase/supabase-js";

const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: service } = process.env;
if (!url || !anon || !service) { console.error("Fill in .env.local first (see .env.example)."); process.exit(1); }

export const email = (u) => (u.includes("@") ? u : `${u}@users.colearn.invalid`).toLowerCase();
export const admin = createClient(url, service, { auth: { persistSession: false } });
export const client = () => createClient(url, anon, { auth: { persistSession: false } });
export const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
export async function signIn(user, password) {
  const c = client();
  ok(await c.auth.signInWithPassword({ email: email(user), password }));
  return c;
}
export async function createTeacher({ username, password, name, timezone, demo = false }) {
  return ok(await admin.auth.admin.createUser({ email: email(username), password, email_confirm: true,
    app_metadata: { role: "teacher", full_name: name, username, timezone, is_demo: demo } })).user;
}
