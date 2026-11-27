"use client";
import { useAction } from "@/components/shared/action-button";
import { updateAssignment } from "@/actions/lessons";

export function AssignmentDate({ id, value, label }: { id: string; value: string; label: string }) {
  const { pending, run } = useAction();
  return <input type="date" aria-label={label} disabled={pending} defaultValue={value} key={value} className="h-8 rounded-lg border border-line bg-white px-2 text-xs focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:cursor-wait disabled:opacity-50"
    onBlur={(e) => e.target.value && e.target.value !== value && run(updateAssignment, { id, scheduled_date: e.target.value }, "Rescheduled")} />;
}
