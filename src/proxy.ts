import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Names what is wrong with the Supabase settings, so a fresh install explains itself instead of crashing. */
function setupProblems() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const problems: string[] = [];
  if (!url) problems.push("NEXT_PUBLIC_SUPABASE_URL is missing");
  else if (url.includes("YOUR-PROJECT")) problems.push("NEXT_PUBLIC_SUPABASE_URL still has the example value");
  else if (!/^https?:\/\/[^/\s]+\/?$/.test(url)) problems.push("NEXT_PUBLIC_SUPABASE_URL must look like https://abcd1234.supabase.co (nothing after .co)");
  if (!anon) problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
  else if (anon.startsWith("your-")) problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY still has the example value");
  return problems;
}

function setupPage(problems: string[]) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CoLearn setup</title>
<style>body{font:16px/1.6 system-ui,sans-serif;background:#f5f7fc;color:#151a30;margin:0;padding:32px 16px}main{max-width:640px;margin:auto;background:#fff;border:1px solid #e3e7f2;border-radius:16px;padding:28px}pre{background:#eef0fd;padding:12px;border-radius:10px;overflow-x:auto}li{margin-bottom:10px}.bad{color:#c4344b}</style></head><body><main>
<h1>Connect CoLearn to Supabase</h1>
<ul class="bad">${problems.map((p) => `<li>${p}</li>`).join("")}</ul>
<ol>
<li>In the project folder (where <code>package.json</code> is), create the settings file:<pre>cp -n .env.example .env.local\nopen -e .env.local</pre>(On Windows, copy <code>.env.example</code> and name the copy <code>.env.local</code>.)</li>
<li>Paste your Project URL, anon (publishable) key and service_role (secret) key from the Supabase dashboard, then save.</li>
<li>Stop the server with <b>Ctrl+C</b>, start it again with <code>npm run dev</code>, and reload this page.</li>
</ol>
<p>Before you can sign in, also run the database files and create your teacher account (see <code>README.md</code>).</p>
</main></body></html>`;
  return new NextResponse(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
}

/** Refreshes the session and keeps signed-out visitors on /login. Role checks happen in layouts, actions and RLS. */
export async function proxy(request: NextRequest) {
  const problems = setupProblems();
  if (problems.length) return setupPage(problems);
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && request.nextUrl.pathname !== "/login") return NextResponse.redirect(new URL("/login", request.url));
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"] };
