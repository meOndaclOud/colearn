import { requireStudent } from "@/lib/auth";
import { Shell } from "@/components/shared/shell";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { student } = await requireStudent();
  return <Shell mode="student" name={student.full_name}>{children}</Shell>;
}
