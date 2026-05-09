import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: values }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("personal_values").select("*").eq("user_id", user.id).order("rank"),
  ]);

  return <SettingsClient profile={profile} values={values ?? []} email={user.email ?? ""} />;
}
