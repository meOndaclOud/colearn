import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";

/** Short-lived link to a private file. Storage policies decide who may create it. */
export async function GET(req: NextRequest) {
  const bucket = req.nextUrl.searchParams.get("bucket");
  const path = req.nextUrl.searchParams.get("path");
  const { db, profile } = await getSession();
  if (!profile) return NextResponse.redirect(new URL("/login", req.url));
  if (!path || (bucket !== "resources" && bucket !== "submissions")) return new NextResponse("Bad request", { status: 400 });
  const name = path.split("/").pop()!.replace(/^[0-9a-f-]{36}-/, "");
  // always download: uploaded files are never rendered in the browser
  const { data, error } = await db.storage.from(bucket).createSignedUrl(path, 60, { download: name });
  if (error || !data) return new NextResponse("File not found, or you do not have access.", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
