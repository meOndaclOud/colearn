"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { login } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import styles from "./login.module.css";

const schema = z.object({ username: z.string().trim().min(1, "Enter your username or email."), password: z.string().min(1, "Enter your password.") });

export function LoginForm() {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  return (
    <form method="post" noValidate className={styles.formCard}
      onSubmit={handleSubmit(async (v) => { setError(""); const r = await login(v); if (r?.error) setError(r.error); })}>
      <div className={styles.formHeader}><span className={styles.formIcon}><LockKeyhole /></span><div><h2>Sign in</h2><p>Teachers use their account. Students use the class login.</p></div></div>
      <Field className={styles.field} label="Username or email" error={errors.username?.message}>
        <span className={styles.inputWrap}><Input className={`${styles.input} ${styles.usernameInput}`} autoComplete="username" autoCapitalize="none" {...register("username")} /><UserRound className={styles.inputIcon} /></span>
      </Field>
      <Field className={styles.field} label="Password" error={errors.password?.message}>
        <span className={styles.inputWrap}><Input className={`${styles.input} pr-11`} type={showPassword ? "text" : "password"} autoComplete="current-password" {...register("password")} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)} className={styles.passwordToggle}>{showPassword ? <EyeOff /> : <Eye />}</button></span>
      </Field>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <Button type="submit" size="lg" className={styles.submit} loading={isSubmitting}>Continue to CoLearn <span aria-hidden className={styles.submitArrow}>→</span></Button>
      <p className={styles.formNote}>Secure access for teachers and students.</p>
    </form>
  );
}
