"use client";
import * as React from "react";
import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({ trigger, title, description, children, open, onOpenChange, wide }: {
  trigger?: React.ReactNode; title: string; description?: string; wide?: boolean;
  children: React.ReactNode | ((close: () => void) => React.ReactNode); open?: boolean; onOpenChange?: (o: boolean) => void;
}) {
  const [own, setOwn] = React.useState(false);
  const isOpen = open ?? own;
  const set = onOpenChange ?? setOwn;
  return (
    <D.Root open={isOpen} onOpenChange={set}>
      {trigger && <D.Trigger asChild>{trigger}</D.Trigger>}
      <D.Portal>
        <D.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[#14253a]/35 backdrop-blur-[3px]" />
        <D.Content {...(description ? {} : { "aria-describedby": undefined })}
          className={cn("dialog-content fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-line bg-white p-5 shadow-[0_24px_80px_-30px_rgb(15_30_48_/_0.42)] sm:p-6", wide ? "max-w-2xl" : "max-w-lg")}>
          <div className="mb-5 flex items-start justify-between gap-3 border-b border-line pb-4">
            <div>
              <D.Title className="text-lg font-semibold tracking-tight">{title}</D.Title>
              {description && <D.Description className="mt-1 text-sm text-muted">{description}</D.Description>}
            </div>
            <D.Close aria-label="Close" className="cursor-pointer rounded-md p-1.5 text-muted transition hover:bg-slate-100 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"><X className="size-4" /></D.Close>
          </div>
          {typeof children === "function" ? children(() => set(false)) : children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
