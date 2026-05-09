import { createClient } from "@/lib/supabase/server";
import { SkillsClient } from "./skills-client";

export default async function SkillsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: skills }, { data: deepWork }] = await Promise.all([
    supabase.from("skills").select("*").eq("user_id", user.id).order("category").order("current_level", { ascending: false }),
    supabase.from("deep_work_sessions").select("project, duration_minutes").eq("user_id", user.id).limit(50),
  ]);

  return <SkillsClient skills={skills ?? []} deepWork={deepWork ?? []} />;
}
