import { createClient } from "@/lib/supabase/server";
import { VisionClient } from "./vision-client";

export default async function VisionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: profile },
    { data: goals },
    { data: values },
    { data: pillars },
  ] = await Promise.all([
    supabase.from("profiles").select("identity_statement").eq("id", user.id).single(),
    supabase.from("goals").select("*").eq("user_id", user.id).eq("status", "active").order("horizon").order("category"),
    supabase.from("personal_values").select("*").eq("user_id", user.id).order("rank"),
    supabase.from("identity_pillars").select("*").eq("user_id", user.id).eq("active", true),
  ]);

  return (
    <VisionClient
      identityStatement={profile?.identity_statement ?? null}
      goals={goals ?? []}
      values={values ?? []}
      pillars={pillars ?? []}
    />
  );
}
