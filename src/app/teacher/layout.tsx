import { requireTeacher } from "@/lib/auth";
import { Shell } from "@/components/shared/shell";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireTeacher();
  return <Shell mode="teacher" name={profile.full_name || "Teacher"} badge={profile.is_demo ? "Demo workspace — sample data" : undefined}>{children}</Shell>;
}
