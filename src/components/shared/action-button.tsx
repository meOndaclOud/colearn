"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/types";

type Action = (input: unknown) => Promise<ActionResult>;

/** Runs a server action with loading, error and success feedback. */
export function useAction() {
  const [pending, start] = React.useTransition();
  const run = (action: Action, input: unknown, success?: string, after?: (r: ActionResult) => void) =>
    start(async () => {
      try {
        const r = await action(input);
        if (r.error) { toast.error(r.error); return; }
        if (success) toast.success(success);
        after?.(r);
      } catch { toast.error("Could not reach the server. Check your connection."); }
    });
  return { pending, run };
}

export function ActionButton({ action, input, success, confirm, redirectTo, children, ...props }: {
  action: Action; input: unknown; success?: string; confirm?: string; redirectTo?: string;
} & Omit<React.ComponentProps<typeof Button>, "onClick">) {
  const { pending, run } = useAction();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const go = () => run(action, input, success, (r) => {
    setOpen(false);
    if (redirectTo) router.push(redirectTo.replace(":id", r.id ?? ""));
  });
  if (!confirm) return <Button {...props} loading={pending} onClick={go}>{children}</Button>;
  return (
    <>
      <Button {...props} onClick={() => setOpen(true)}>{children}</Button>
      <Modal title="Are you sure?" description={confirm} open={open} onOpenChange={setOpen}>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="danger" loading={pending} onClick={go}>Yes, continue</Button>
        </div>
      </Modal>
    </>
  );
}

/** A select that saves as soon as it changes. */
export function QuickSelect({ action, input, field, value, options, label }: { action: Action; input: Record<string, unknown>; field: string; value: string; options: [string, string][]; label: string }) {
  const { pending, run } = useAction();
  return (
    <select aria-label={label} disabled={pending} value={value} onChange={(e) => run(action, { ...input, [field]: e.target.value }, "Saved")}
      className="select-control h-8 rounded-lg border border-line bg-white px-2 pr-8 text-xs font-semibold focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:cursor-wait disabled:opacity-50">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
