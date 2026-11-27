"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/form";

export function StudentFilter({ students, value, allLabel = "All students" }: { students: { id: string; name: string }[]; value: string; allLabel?: string }) {
  const router = useRouter(), path = usePathname(), params = useSearchParams();
  return (
    <Select aria-label="Filter by student" className="h-9 w-auto" value={value} onChange={(e) => {
      const p = new URLSearchParams(params);
      if (e.target.value) p.set("student", e.target.value); else p.delete("student");
      router.push(`${path}?${p}`);
    }}>
      <option value="">{allLabel}</option>
      {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </Select>
  );
}
