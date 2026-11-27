import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarCheck, GraduationCap, ListChecks, Sparkles, Trophy } from "lucide-react";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./form";
import styles from "./login.module.css";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const { profile } = await getSession();
  if (profile) redirect("/");
  return (
    <main className={styles.scene}>
      <div aria-hidden="true" className={styles.ambient}>
        <span className={`${styles.glow} ${styles.glowBlue}`} />
        <span className={`${styles.glow} ${styles.glowLavender}`} />
        <span className={`${styles.glow} ${styles.glowWarm}`} />
        {Array.from({ length: 12 }, (_, i) => <i key={i} className={styles.particle} />)}
        <span className={`${styles.geometry} ${styles.ringOne}`} />
        <span className={`${styles.geometry} ${styles.ringTwo}`} />
        <span className={`${styles.geometry} ${styles.diamond}`} />
        <span className={`${styles.geometry} ${styles.cross}`} />
      </div>

      <div className={styles.layout}>
        <section className={styles.welcome}>
          <div className={styles.brand}><span className={styles.brandMark}><GraduationCap /></span>CoLearn<span className={styles.brandTag}>LEARNING, IN MOTION</span></div>

          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><Sparkles />A more thoughtful way to learn</p>
            <h1>Small steps.<br /><span>Remarkable growth.</span></h1>
            <p className={styles.intro}>A shared space for curious students and the teachers who help them thrive.</p>
          </div>

          <div className={styles.path} aria-label="Plan, practice, make progress">
            <div className={styles.pathLine} />
            <div className={styles.pathStep}><span className={styles.pathIcon}><CalendarCheck /></span><span><b>Plan</b><small>Make space for learning</small></span></div>
            <div className={styles.pathStep}><span className={styles.pathIcon}><ListChecks /></span><span><b>Practice</b><small>Take the next clear step</small></span></div>
            <div className={styles.pathStep}><span className={styles.pathIcon}><Trophy /></span><span><b>Progress</b><small>Notice how far you’ve come</small></span></div>
          </div>

          <div className={styles.heroFoot}><span className={styles.liveMark} />A classroom built around your next step<span className={styles.footArrow}><ArrowUpRight /></span></div>
          <div aria-hidden="true" className={styles.heroOrb} />
        </section>

        <section className={styles.formSide} aria-label="Sign in to CoLearn">
          <div className={styles.formIntro}><span className={styles.formKicker}>YOUR LEARNING SPACE</span><h2>Welcome back</h2><p>Sign in to pick up where you left off.</p></div>
          <LoginForm />
          <p className={styles.privacy}><span><Sparkles /></span>Your classroom, your progress, all in one place.</p>
        </section>
      </div>
      <footer className={styles.footer}><span>CoLearn</span><span>An educational platform by Khine</span></footer>
    </main>
  );
}
