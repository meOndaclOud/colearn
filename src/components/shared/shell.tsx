"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, BookOpen, CalendarDays, FolderCheck, GraduationCap, LayoutDashboard, Library, LogOut, Menu, Settings, Trophy, Users, X, Repeat } from "lucide-react";
import { logout, switchStudent } from "@/actions/auth";
import { cn } from "@/lib/utils";

const NAV = {
  teacher: [
    ["/teacher", "Dashboard", LayoutDashboard], ["/teacher/students", "Students", Users], ["/teacher/planner", "Lesson Planner", CalendarDays],
    ["/teacher/challenges", "Challenge Centre", Trophy], ["/teacher/submissions", "Project Submissions", FolderCheck],
    ["/teacher/reports", "Progress & Reports", BarChart3], ["/teacher/library", "Resource Library", Library], ["/teacher/settings", "Settings", Settings],
  ],
  student: [["/student", "Today", BookOpen], ["/student/challenges", "Challenges", Trophy], ["/student/projects", "My Projects", FolderCheck], ["/student/progress", "My Progress", BarChart3]],
} as const;

export function Shell({ mode, name, badge, children }: { mode: "teacher" | "student"; name: string; badge?: string; children: React.ReactNode }) {
  const path = usePathname();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => setOpen(false), [path]);
  const items = NAV[mode];
  const root = `/${mode}`;
  const nav = (
    <>
      <nav className="flex-1 space-y-1" aria-label={mode === "teacher" ? "Teacher workspace" : "Student learning space"}>
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">{mode === "teacher" ? "Workspace" : "Learning space"}</p>
        {items.map(([href, label, Icon]) => {
          const on = href === root ? path === root || path.startsWith("/student/lessons") && mode === "student" : path.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined}
              className={cn("group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors", on ? "bg-brand-soft text-brand-dark" : "text-muted hover:bg-slate-50 hover:text-ink")}>
              {on && <span className="nav-indicator absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-brand" />}
              <Icon className={cn("size-[17px] transition-colors", on ? "text-brand" : "text-slate-400 group-hover:text-ink")} />{label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-line pt-4">
        <div className="mb-3 flex min-w-0 items-center gap-3 px-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e8edff] text-xs font-bold text-brand">{name.split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase()}</span>
          <span className="min-w-0"><span className="block truncate text-[13px] font-semibold">{name}</span><span className="mt-0.5 block text-[11px] text-muted">{mode === "teacher" ? "Teacher account" : "Student account"}</span></span>
        </div>
        {mode === "student" && <form action={switchStudent}><button className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted transition hover:bg-slate-50 hover:text-ink"><Repeat className="size-4 text-slate-400" />Switch student</button></form>}
        <form action={logout}><button className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-muted transition hover:bg-slate-50 hover:text-ink"><LogOut className="size-4 text-slate-400" />Log out</button></form>
      </div>
    </>
  );
  const brand = (
    <Link href={root} className="flex items-center gap-2.5 text-[17px] font-bold tracking-[-0.04em] text-ink">
      <span className="grid size-9 place-items-center rounded-[10px] bg-brand text-white shadow-[0_4px_12px_rgb(52_93_232_/_0.22)]"><GraduationCap className="size-[19px]" /></span>CoLearn<span className="ml-0.5 mt-0.5 text-[9px] font-semibold uppercase tracking-[.15em] text-slate-400">{mode}</span>
    </Link>
  );
  return (
    <div className="min-h-screen lg:pl-[248px]">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col gap-8 border-r border-line bg-white px-4 py-5 lg:flex">{brand}{nav}</aside>
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        {brand}
        <button aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)} className="rounded-lg border border-line bg-white p-2 text-ink transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand">{open ? <X className="size-5" /> : <Menu className="size-5" />}</button>
      </header>
      {open && <div id="mobile-navigation" className="no-print fixed inset-x-0 bottom-0 top-[61px] z-40 flex flex-col gap-4 overflow-y-auto border-b border-line bg-white p-4 shadow-lift lg:hidden">{nav}</div>}
      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        {badge && <p className="no-print mb-4 inline-flex rounded-md border border-warn/15 bg-warn-soft px-2.5 py-1.5 text-[11px] font-semibold text-warn">{badge}</p>}
        <motion.div key={path} initial={{ opacity: 0, y: reduceMotion ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}>{children}</motion.div>
      </main>
    </div>
  );
}
