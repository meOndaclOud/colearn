"use client";
import { Checkbox } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export type Opt = { id: string; name: string };

export function StudentPicker({ students, value, onChange }: { students: Opt[]; value: string[]; onChange: (v: string[]) => void }) {
  if (!students.length) return <p className="text-sm text-muted">Add a student first.</p>;
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 flex w-full items-center justify-between text-[13px] font-medium">Students
        <Button variant="ghost" size="sm" onClick={() => onChange(value.length === students.length ? [] : students.map((s) => s.id))}>{value.length === students.length ? "Clear" : "Select all"}</Button></legend>
      <div className="grid max-h-44 gap-2 overflow-y-auto rounded-xl border border-line p-3 sm:grid-cols-2">
        {students.map((s) => <Checkbox key={s.id} label={s.name} checked={value.includes(s.id)} onChange={(e) => onChange(e.target.checked ? [...value, s.id] : value.filter((x) => x !== s.id))} />)}
      </div>
    </fieldset>
  );
}
