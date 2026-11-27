import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md p-10 text-center">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-muted">This page does not exist, or it is not available to you.</p>
      <Button asChild className="mt-4"><Link href="/">Go home</Link></Button>
    </div>
  );
}
