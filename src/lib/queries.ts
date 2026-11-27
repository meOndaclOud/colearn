import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { must, signedAvatars } from "./data";
import type { LibraryItem, Student, Subject } from "./types";

export const getStudents = async (db: SupabaseClient) => must<Student[]>(await db.from("students").select("*").order("full_name"));
export const getSubjects = async (db: SupabaseClient) => must<Subject[]>(await db.from("subjects").select("*").order("name"));
export const getLibrary = async (db: SupabaseClient) => must<LibraryItem[]>(await db.from("resource_library").select("*").order("created_at", { ascending: false }));
export const options = (students: Student[]) => students.filter((s) => s.is_active).map((s) => ({ id: s.id, name: s.full_name }));
export const lessonOptions = async (db: SupabaseClient) =>
  must<{ id: string; title: string; is_template: boolean }[]>(await db.from("lessons").select("id, title, is_template").order("updated_at", { ascending: false }))
    .filter((l) => !l.is_template).map((l) => ({ id: l.id, name: l.title }));
export const avatarsFor = (db: SupabaseClient, students: Student[]) => signedAvatars(db, students.map((s) => s.avatar_path));
