"use client";

import { useState } from "react";
import { Check, MoveUpRight, Sparkles } from "lucide-react";
import { pickStudent } from "@/actions/auth";
import { Avatar } from "@/components/shared/bits";
import styles from "./pick.module.css";

type StudentChoice = { id: string; name: string; color: string; avatar?: string };

export function StudentSelection({ students }: { students: StudentChoice[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className={styles.stationGrid}>
      {students.map((student, i) => {
        const isSelected = selected === student.id;
        return (
          <form key={student.id} action={pickStudent.bind(null, student.id)} onSubmit={() => setSelected(student.id)} className={styles.stationForm} style={{ animationDelay: `${Math.min(i * 45, 450)}ms` }}>
            <button type="submit" className={`${styles.station} ${isSelected ? styles.stationSelected : ""}`} disabled={selected !== null} aria-label={`Choose ${student.name}`} aria-busy={isSelected}>
              <span className={styles.avatarHalo}>
                <span className={styles.avatarOrbit} />
                <span className={styles.avatarFrame}><Avatar size="lg" name={student.name} color={student.color} src={student.avatar} /></span>
                <span className={styles.avatarSpark} aria-hidden="true"><Sparkles /></span>
              </span>
              <span className={styles.stationName}>{student.name}</span>
              <span className={styles.stationHint}>{isSelected ? <><Check aria-hidden="true" />Opening your space…</> : <>Enter your space <MoveUpRight aria-hidden="true" /></>}</span>
            </button>
          </form>
        );
      })}
    </div>
  );
}
