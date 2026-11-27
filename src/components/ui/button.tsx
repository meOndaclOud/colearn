import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold tracking-[-0.01em] transition-[background,color,border-color,box-shadow,transform] duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand active:translate-y-px disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-brand text-white shadow-[0_2px_5px_rgb(52_93_232_/_0.2)] hover:bg-brand-dark hover:shadow-[0_5px_12px_rgb(52_93_232_/_0.23)]",
        outline: "border border-line bg-white text-ink shadow-[0_1px_2px_rgb(24_39_57_/_0.04)] hover:border-brand/35 hover:bg-brand-soft/50 hover:text-brand-dark",
        soft: "bg-brand-soft text-brand-dark hover:bg-[#e2e9ff]",
        ghost: "text-muted hover:bg-slate-100 hover:text-ink",
        danger: "border border-danger/20 bg-white text-danger hover:border-danger/30 hover:bg-danger-soft",
        teal: "bg-teal text-white shadow-[0_2px_5px_rgb(7_138_120_/_0.18)] hover:brightness-95",
      },
      size: { default: "h-10 px-4", sm: "h-8 px-3 text-[13px]", lg: "h-11 px-5", icon: "size-9 !p-0" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type Props = React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean };

export function Button({ className, variant, size, asChild, loading, children, disabled, type, ...props }: Props) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (asChild) return <Slot.Root className={classes} {...props}>{children}</Slot.Root>;
  return (
    <button type={type ?? "button"} className={classes} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="animate-spin" />}{children}
    </button>
  );
}
