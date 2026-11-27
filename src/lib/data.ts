import "server-only";
import sanitizeHtml from "sanitize-html";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Activity, Resource } from "./types";

/** Throws on query errors so the error boundary shows instead of a misleading empty screen. */
export function must<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const clean = (html: string) => sanitizeHtml(html, {
  allowedTags: ["p","br","strong","em","s","u","h2","h3","ul","ol","li","blockquote","code","pre","a","hr"],
  allowedAttributes: { a: ["href","target","rel"] },
  allowedSchemes: ["http","https","mailto"],
  transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }) },
});

export async function resourcesFor(db: SupabaseClient, column: "lesson_id" | "activity_id" | "challenge_id" | "project_id", ids: string[]) {
  const map: Record<string, Resource[]> = {};
  if (!ids.length) return map;
  const rows = must<(Resource & Record<string, string>)[]>(await db.from("activity_resources").select("*").in(column, ids).order("position"));
  for (const r of rows) (map[r[column]] ??= []).push({ id: r.id, label: r.label, action: r.action, url: r.url, file_path: r.file_path });
  return map;
}

export async function activitiesFor(db: SupabaseClient, lessonId: string) {
  const rows = must<(Activity & { id: string })[]>(await db.from("activities").select("*").eq("lesson_id", lessonId).order("position"));
  const res = await resourcesFor(db, "activity_id", rows.map((a) => a.id));
  return rows.map((a) => ({ ...a, resources: res[a.id] ?? [] }));
}

export async function signedAvatars(db: SupabaseClient, paths: (string | null)[]) {
  const list = paths.filter(Boolean) as string[];
  const map: Record<string, string> = {};
  if (!list.length) return map;
  const { data } = await db.storage.from("avatars").createSignedUrls(list, 3600);
  data?.forEach((d) => { if (d.path && d.signedUrl) map[d.path] = d.signedUrl; });
  return map;
}
