"use client";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md p-10 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">The page could not load. Your work is saved in the database; try again.</p>
      <Button className="mt-4" onClick={reset}>Try again</Button>
    </div>
  );
}
