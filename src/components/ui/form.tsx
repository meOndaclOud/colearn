import * as React from "react";
import { cn } from "@/lib/utils";

const field = "w-full rounded-lg border border-line bg-white px-3 text-sm text-ink shadow-[0_1px_2px_rgb(23_35_52_/_0.025)] transition-[border-color,box-shadow,background] duration-150 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-muted";
export const Input = ({ className, ...p }: React.ComponentProps<"input">) => <input className={cn(field, "h-10", className)} {...p} />;
export const Textarea = ({ className, ...p }: React.ComponentProps<"textarea">) => <textarea className={cn(field, "min-h-20 resize-y py-2 leading-5", className)} {...p} />;
export const Select = ({ className, ...p }: React.ComponentProps<"select">) => <select className={cn(field, "select-control h-10 pr-9", className)} {...p} />;
export const Checkbox = ({ label, className, ...p }: React.ComponentProps<"input"> & { label: React.ReactNode }) => (
  <label className={cn("flex cursor-pointer items-center gap-2 text-sm leading-5", className)}><input type="checkbox" className="size-4 shrink-0 accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" {...p} />{label}</label>
);
export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-muted">{hint}</span>}
      {error && <span role="alert" className="block text-xs text-danger">{error}</span>}
    </label>
  );
}
