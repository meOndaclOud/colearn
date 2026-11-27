import * as React from "react";
import Link from "next/link";
import { type LucideIcon, ChevronLeft } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { COLORS, STATUS } from "@/lib/constants";
import { Card } from "@/components/ui/card";

const tones = { grey: "border border-slate-200 bg-slate-50 text-slate-600", blue: "border border-brand/10 bg-brand-soft text-brand-dark", amber: "border border-amber-200/70 bg-warn-soft text-warn", teal: "border border-teal/10 bg-teal-soft text-teal-800", red: "border border-danger/10 bg-danger-soft text-danger" };
export function Badge({ tone = "grey", children, className }: { tone?: keyof typeof tones; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold leading-none tracking-wide", tones[tone], className)}>{children}</span>;
}
export const StatusBadge = ({ status }: { status: string }) => <Badge tone={STATUS[status]?.tone}>{STATUS[status]?.label ?? status}</Badge>;

export function Avatar({ name, color = "indigo", src, size = "md" }: { name: string; color?: string; src?: string; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "size-8 text-xs", md: "size-11 text-sm", lg: "size-16 text-xl" }[size];
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <img src={src} alt="" className={cn("shrink-0 rounded-full object-cover", s)} />;
  return <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full font-semibold ring-2 ring-white", s, COLORS[color] ?? COLORS.indigo)}>{initials(name)}</span>;
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progress"}>
      <div className={cn("h-full origin-left rounded-full bg-[#365CEB] transition-[width] duration-500 ease-out")} style={{ width: `${value}%` }} />
    </div>
  );
}

export function PageHeader({ title, subtitle, back, children }: { title: string; subtitle?: React.ReactNode; back?: { href: string; label: string }; children?: React.ReactNode }) {
  return (
    <header className="mb-7">
      {back && <Link href={back.href} className="no-print mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-brand"><ChevronLeft className="size-4" />{back.label}</Link>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.04em] text-ink">{title}</h1>
          {subtitle && <div className="mt-2 text-[13px] leading-5 text-muted">{subtitle}</div>}
        </div>
        {children && <div className="no-print flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </header>
  );
}

export function Empty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line bg-slate-50/70 px-6 py-10 text-center">
      <span className="mb-3 grid size-10 place-items-center rounded-lg border border-line bg-white text-brand shadow-sm"><Icon className="size-[18px]" /></span>
      <p className="font-semibold tracking-tight">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, icon: Icon, href, tone = "bg-brand-soft text-brand" }: { label: string; value: React.ReactNode; icon: LucideIcon; href?: string; tone?: string }) {
  const body = (
    <Card className={cn("flex h-full items-center gap-3.5 p-4", href && "transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand/20 hover:shadow-lift")}>
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", tone)}><Icon className="size-[18px]" /></span>
      <div><div className="text-[25px] font-semibold leading-none tracking-[-0.04em]">{value}</div><div className="mt-1.5 text-xs font-medium text-muted">{label}</div></div>
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export const Tabs = ({ items, active }: { items: { key: string; label: string; href: string }[]; active: string }) => (
  <nav className="no-print mb-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Sections">
    {items.map((t) => (
      <Link key={t.key} href={t.href} scroll={false} aria-current={t.key === active ? "page" : undefined}
        className={cn("whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors", t.key === active ? "border-brand text-brand-dark" : "border-transparent text-muted hover:text-ink")}>{t.label}</Link>
    ))}
  </nav>
);

export const Rich = ({ html }: { html: string }) => (html && html !== "<p></p>" ? <div className="rich text-[15px] whitespace-pre-line" dangerouslySetInnerHTML={{ __html: html }} /> : null);
export const Detail = ({ label, children }: { label: string; children?: React.ReactNode }) =>
  children ? <div><h3 className="mb-1 text-xs font-semibold text-muted">{label}</h3><div className="whitespace-pre-line text-sm leading-relaxed">{children}</div></div> : null;
