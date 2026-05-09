import { createClient } from "@/lib/supabase/server";
import { DisciplineClient } from "./discipline-client";
import { daysAgo } from "@/lib/utils";

export default async function DisciplinePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const thirtyDaysAgo = daysAgo(30);

  const [
    { data: habits },
    { data: habitLogs },
    { data: discomfortLog },
  ] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("is_non_negotiable", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("log_date", thirtyDaysAgo),
    supabase
      .from("discomfort_log")
      .select("*")
      .eq("user_id", user.id)
      .order("log_date", { ascending: false })
      .limit(10),
  ]);

  return (
    <DisciplineClient
      habits={habits ?? []}
      habitLogs={habitLogs ?? []}
      discomfortLog={discomfortLog ?? []}
    />
  );
}
