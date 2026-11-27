"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { requireClass, STUDENT_COOKIE } from "@/lib/auth";
import { loginEmail } from "@/lib/login";

export async function login(input: { username: string; password: string }): Promise<{ error: string }> {
  const p = z.object({ username: z.string().trim().min(1).max(200), password: z.string().min(1).max(200) }).safeParse(input);
  if (!p.success) return { error: "Enter your username and password." };
  const db = await supabaseServer();
  const { error } = await db.auth.signInWithPassword({ email: loginEmail(p.data.username), password: p.data.password });
  if (error) return { error: error.status === 400 ? "Wrong username or password." : "Sign-in is unavailable right now. Try again." };
  (await cookies()).delete(STUDENT_COOKIE);
  redirect("/");
}

export async function logout() {
  await (await supabaseServer()).auth.signOut();
  (await cookies()).delete(STUDENT_COOKIE);
  redirect("/login");
}

export async function pickStudent(id: string) {
  const { db } = await requireClass();
  const { data } = await db.from("students").select("id").eq("id", id).maybeSingle();
  if (!data) redirect("/student/pick");
  (await cookies()).set(STUDENT_COOKIE, data.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  redirect("/student");
}

export async function switchStudent() {
  (await cookies()).delete(STUDENT_COOKIE);
  redirect("/student/pick");
}
