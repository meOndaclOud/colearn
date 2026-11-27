import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = ({ className, ...p }: React.ComponentProps<"div">) => <div className={cn("rounded-xl border border-line/90 bg-white p-5 shadow-soft", className)} {...p} />;
export const CardTitle = ({ className, ...p }: React.ComponentProps<"h2">) => <h2 className={cn("text-[15px] font-semibold tracking-[-0.015em] text-ink", className)} {...p} />;
