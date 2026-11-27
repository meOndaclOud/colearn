import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import type { ActionResult, Profile } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type Ctx = { db: SupabaseClient; profile: Profile };
export const uuid = z.guid();
export const date = z.iso.date();
export const url = z.url({ protocol: /^https?$/, error: "Links must start with http:// or https://" });

export function check(res: { error: { message: string; code?: string } | null }) {
  if (!res.error) return;
  if (res.error.code === "23505") throw new Error("That already exists.");
  throw new Error(res.error.message);
}

/** Verifies the role on the server, validates input, runs, and refreshes pages. RLS is the second line of defence. */
export async function run<S extends z.ZodType>(role: Profile["role"], schema: S, input: unknown,
  fn: (data: z.output<S>, ctx: Ctx) => Promise<string | void>): Promise<ActionResult> {
  const { db, profile } = await getSession();
  if (!profile || profile.role !== role) return { error: "You are not allowed to do that. Please sign in again." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  try {
    const id = await fn(parsed.data, { db, profile });
    revalidatePath("/", "layout");
    return { id: id || undefined };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
