import "server-only";
import { createClient } from "@supabase/supabase-js";
/** Bypasses RLS. Only for managing the class login, after the caller is verified as a teacher. */
export const supabaseAdmin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
