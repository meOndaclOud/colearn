"use server";
import { z } from "zod";
import { run, check, uuid } from "./shared";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { loginEmail } from "@/lib/login";

export async function saveProfile(input: unknown) {
  const schema = z.object({ full_name: z.string().trim().min(2, "Enter your name.").max(120),
    timezone: z.string().refine((t) => { try { new Intl.DateTimeFormat("en", { timeZone: t }); return true; } catch { return false; } }, "Unknown timezone.") });
  return run("teacher", schema, input, async (d, { db, profile }) => { check(await db.from("profiles").update(d).eq("id", profile.id)); });
}

export async function changePassword(input: unknown) {
  return run("teacher", z.object({ password: z.string().min(8, "Use at least 8 characters.").max(72) }), input, async ({ password }, { db }) => {
    const { error } = await db.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  });
}

export async function saveClassLogin(input: unknown) {
  const schema = z.object({ username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/, "Username: 3–30 letters, numbers, dot, dash or underscore."),
    password: z.string().min(8, "Use at least 8 characters.").max(72) });
  return run("teacher", schema, input, async ({ username, password }, { db, profile }) => {
    if (profile.is_demo) throw new Error("The class login is fixed in the demo workspace.");
    const admin = supabaseAdmin();
    const existing = await db.from("profiles").select("id").eq("role", "class").eq("teacher_id", profile.id).maybeSingle();
    check(existing);
    // the auth server only reports a generic error for duplicates, so check first
    const taken = await admin.from("profiles").select("id").eq("username", username);
    check(taken);
    if (taken.data!.some((p) => p.id !== existing.data?.id)) throw new Error("That username is taken. Choose another.");
    const app_metadata = { role: "class", teacher_id: profile.id, username };
    const { error } = existing.data
      ? await admin.auth.admin.updateUserById(existing.data.id, { email: loginEmail(username), password, email_confirm: true, app_metadata })
      : await admin.auth.admin.createUser({ email: loginEmail(username), password, email_confirm: true, app_metadata });
    if (error) throw new Error(/already/i.test(error.message) ? "That username is taken. Choose another." : error.message);
    if (existing.data) check(await admin.from("profiles").update({ username }).eq("id", existing.data.id));
  });
}

export async function saveSubject(input: unknown) {
  return run("teacher", z.object({ name: z.string().trim().min(2, "Enter a subject name.").max(60), color: z.string().max(20) }), input,
    async (d, { db }) => { check(await db.from("subjects").insert(d)); });
}
export async function deleteSubject(input: unknown) {
  return run("teacher", z.object({ id: uuid }), input, async ({ id }, { db }) => { check(await db.from("subjects").delete().eq("id", id)); });
}
