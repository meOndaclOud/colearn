"use client";
import { supabaseBrowser } from "./supabase/client";
import { MAX_FILE } from "./constants";

/** Uploads straight to private Supabase Storage; storage policies decide what is allowed. */
export async function uploadFile(bucket: string, folder: string, file: File) {
  const max = bucket === "avatars" ? 2 * 1024 * 1024 : MAX_FILE;
  if (file.size > max) throw new Error(`That file is too large (limit ${max / 1024 / 1024} MB).`);
  const safe = file.name.normalize("NFKD").replace(/[^A-Za-z0-9._-]+/g, "_").slice(-80);
  const path = `${folder}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabaseBrowser().storage.from(bucket).upload(path, file, { contentType: file.type || undefined });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}
