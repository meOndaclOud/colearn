import { BookOpen, GraduationCap, LogOut, Pencil, Sparkles, Users } from "lucide-react";
import { requireClass } from "@/lib/auth";
import { avatarsFor, getStudents } from "@/lib/queries";
import { logout } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/shared/bits";
import { StudentSelection } from "./student-selection";
import styles from "./pick.module.css";

export const metadata = { title: "Who are you?" };

export default async function Pick() {
  const { db, teacherName } = await requireClass();
  const students = await getStudents(db);
  const avatars = await avatarsFor(db, students);
  return (
    <main className={styles.scene}>
      <div className={styles.ambient} aria-hidden="true">
        <span className={`${styles.cloud} ${styles.cloudOne}`} />
        <span className={`${styles.cloud} ${styles.cloudTwo}`} />
        <span className={`${styles.cloud} ${styles.cloudThree}`} />
        <span className={`${styles.lightOrb} ${styles.lightOne}`} />
        <span className={`${styles.lightOrb} ${styles.lightTwo}`} />
        {Array.from({ length: 8 }, (_, i) => <i key={i} className={styles.particle} />)}
        <BookOpen className={`${styles.floatObject} ${styles.book}`} />
        <Pencil className={`${styles.floatObject} ${styles.pencil}`} />
        <Sparkles className={`${styles.floatObject} ${styles.sparkle}`} />
      </div>

      <header className={styles.topBar}>
        <div className={styles.brand}><span className={styles.brandMark}><GraduationCap /></span>CoLearn</div>
        {teacherName && <span className={styles.classLabel}><Users />{teacherName}&apos;s class</span>}
      </header>

      <section className={styles.content} aria-labelledby="welcome-title">
        <p className={styles.eyebrow}><Sparkles aria-hidden="true" />Your classroom is ready</p>
        <h1 id="welcome-title" className={styles.title}>Welcome to CoLearn!</h1>
        <p className={styles.subtitle}>Choose your name and step into your learning space{teacherName ? <>, <span className={styles.teacherName}>{teacherName}&apos;s class</span></> : ""}.</p>

        <div className={styles.selectionHeader}>
          <div><h2 className={styles.selectionTitle}>Choose your learning station</h2><p className={styles.selectionHint}>Tap your profile to get started.</p></div>
          {students.length > 0 && <span className={styles.studentCount}>{students.length} {students.length === 1 ? "student" : "students"}</span>}
        </div>

        {students.length ? <StudentSelection students={students.map((s) => ({ id: s.id, name: s.full_name, color: s.avatar_color, avatar: s.avatar_path ? avatars[s.avatar_path] : undefined }))} />
          : <div className="mx-auto mt-8 max-w-lg"><Empty icon={Users} title="No students yet">Ask your teacher to add your name to the class.</Empty></div>}
      </section>

      <footer className={styles.footer}>
        <form action={logout}><Button type="submit" variant="ghost" size="sm"><LogOut />Sign out of class</Button></form>
      </footer>
    </main>
  );
}
