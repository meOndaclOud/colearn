"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { useAction, ActionButton } from "@/components/shared/action-button";
import { changePassword, deleteSubject, saveClassLogin, saveProfile, saveSubject } from "@/actions/settings";
import type { Subject } from "@/lib/types";

export function SettingsForms({ name, timezone, zones, classUser, subjects, isDemo }: { name: string; timezone: string; zones: string[]; classUser: string; subjects: Subject[]; isDemo: boolean }) {
  const [p, setP] = useState({ full_name: name, timezone });
  const [c, setC] = useState({ username: classUser, password: "" });
  const [pw, setPw] = useState("");
  const [subject, setSubject] = useState("");
  const { pending, run } = useAction();
  const submit = (fn: () => void) => (e: React.FormEvent) => { e.preventDefault(); fn(); };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><form className="space-y-3" onSubmit={submit(() => run(saveProfile, p, "Profile saved"))}>
        <CardTitle>Your profile</CardTitle>
        <Field label="Name"><Input value={p.full_name} onChange={(e) => setP({ ...p, full_name: e.target.value })} /></Field>
        <Field label="Timezone" hint="Decides when a scheduled lesson becomes visible."><Input list="zones" value={p.timezone} onChange={(e) => setP({ ...p, timezone: e.target.value })} /><datalist id="zones">{zones.map((z) => <option key={z} value={z} />)}</datalist></Field>
        <Button type="submit" loading={pending}>Save profile</Button>
      </form></Card>
      <Card><form className="space-y-3" onSubmit={submit(() => run(saveClassLogin, c, "Class login saved", () => setC((x) => ({ ...x, password: "" }))))}>
        <CardTitle>Class login for students</CardTitle>
        <p className="text-sm text-muted">All students share this, then pick their name. Anyone who knows it can open any student&apos;s work, so share it only with your class.</p>
        <Field label="Class username"><Input autoCapitalize="none" autoComplete="off" value={c.username} disabled={isDemo} onChange={(e) => setC({ ...c, username: e.target.value })} /></Field>
        <Field label={classUser ? "New class password" : "Class password"} hint="At least 8 characters"><Input type="password" autoComplete="new-password" value={c.password} disabled={isDemo} onChange={(e) => setC({ ...c, password: e.target.value })} /></Field>
        <Button type="submit" loading={pending} disabled={isDemo}>{classUser ? "Update class login" : "Create class login"}</Button>
      </form></Card>
      <Card className="space-y-3">
        <CardTitle>Subjects</CardTitle>
        <ul className="flex flex-wrap gap-2">{subjects.map((s) => (
          <li key={s.id} className="flex items-center gap-1 rounded-full bg-brand-soft py-1 pl-3 pr-1 text-sm">{s.name}
            <ActionButton variant="ghost" size="icon" className="size-6" aria-label={`Delete ${s.name}`} action={deleteSubject} input={{ id: s.id }} confirm={`Delete the subject "${s.name}"? Lessons keep their content.`}><X /></ActionButton></li>))}</ul>
        <form className="flex gap-2" onSubmit={submit(() => run(saveSubject, { name: subject, color: "indigo" }, "Subject added", () => setSubject("")))}>
          <Input aria-label="New subject" placeholder="New subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Button type="submit" loading={pending}>Add</Button>
        </form>
      </Card>
      <Card><form className="space-y-3" onSubmit={submit(() => run(changePassword, { password: pw }, "Password changed", () => setPw("")))}>
        <CardTitle>Change your password</CardTitle>
        <Field label="New password"><Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Button type="submit" loading={pending} disabled={isDemo}>Change password</Button>
      </form></Card>
    </div>
  );
}
