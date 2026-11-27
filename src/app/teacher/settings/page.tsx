import { requireTeacher } from "@/lib/auth";
import { must } from "@/lib/data";
import { getSubjects } from "@/lib/queries";
import { PageHeader } from "@/components/shared/bits";
import { SettingsForms } from "./forms";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const { db, profile } = await requireTeacher();
  const [subjects, cls] = await Promise.all([getSubjects(db), db.from("profiles").select("username").eq("role", "class").eq("teacher_id", profile.id)]);
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsForms name={profile.full_name} timezone={profile.timezone} zones={Intl.supportedValuesOf("timeZone")} classUser={must<{ username: string }[]>(cls)[0]?.username ?? ""} subjects={subjects} isDemo={profile.is_demo} />
    </>
  );
}
