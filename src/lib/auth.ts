import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";
import { todayIn } from "./utils";
import type { Profile, Student } from "./types";

export const STUDENT_COOKIE = "colearn_student";

export const getSession = cache(async () => {
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { db, profile: null };
  const { data } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { db, profile: data as Profile | null };
});

export async function requireTeacher() {
  const { db, profile } = await getSession();
  if (!profile) redirect("/login");
  if (profile.role !== "teacher") redirect("/student");
  return { db, profile, today: todayIn(profile.timezone) };
}

export async function requireClass() {
  const { db, profile } = await getSession();
  if (!profile) redirect("/login");
  if (profile.role !== "class") redirect("/teacher");
  const { data: teacher } = await db.from("profiles").select("timezone, full_name").eq("id", profile.teacher_id).single();
  const timezone: string = teacher?.timezone ?? "UTC";
  return { db, profile, timezone, today: todayIn(timezone), teacherName: (teacher?.full_name as string) ?? "" };
}

/** Class login plus the pupil picked on this device. */
export async function requireStudent() {
  const ctx = await requireClass();
  const id = (await cookies()).get(STUDENT_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) redirect("/student/pick");
  const { data } = await ctx.db.from("students").select("*").eq("id", id).maybeSingle();
  if (!data) redirect("/student/pick");
  return { ...ctx, student: data as Student };
}
