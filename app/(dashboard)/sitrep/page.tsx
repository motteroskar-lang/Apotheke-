import { createClient } from "@/lib/supabase/server";
import { SitrepClient } from "./sitrep-client";
import { getWeekStart, isoDate, daysAgo } from "@/lib/utils";
import { format } from "date-fns";

export default async function SitrepPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const weekStart = format(getWeekStart(), "yyyy-MM-dd");
  const prevWeekStart = format(getWeekStart(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), "yyyy-MM-dd");

  const [
    { data: currentSitrep },
    { data: previousSitrep },
    { data: workouts },
    { data: deepWork },
    { data: sleepRecords },
    { data: habitLogs },
    { data: habits },
    { data: allSitreps },
  ] = await Promise.all([
    supabase.from("weekly_sitrep").select("*").eq("user_id", user.id).eq("week_start", weekStart).maybeSingle(),
    supabase.from("weekly_sitrep").select("*").eq("user_id", user.id).eq("week_start", prevWeekStart).maybeSingle(),
    supabase.from("workouts").select("*").eq("user_id", user.id).gte("workout_date", weekStart),
    supabase.from("deep_work_sessions").select("*").eq("user_id", user.id).gte("session_date", weekStart),
    supabase.from("sleep_records").select("*").eq("user_id", user.id).gte("sleep_date", weekStart),
    supabase.from("habit_logs").select("*").eq("user_id", user.id).gte("log_date", weekStart),
    supabase.from("habits").select("*").eq("user_id", user.id).eq("is_non_negotiable", true).eq("active", true),
    supabase.from("weekly_sitrep").select("*").eq("user_id", user.id).eq("completed", true)
      .order("week_start", { ascending: false }).limit(8),
  ]);

  // Auto-summary
  const trainingCount = workouts?.length ?? 0;
  const deepWorkHours = ((deepWork?.reduce((a, s) => a + s.duration_minutes, 0) ?? 0) / 60).toFixed(1);
  const sleepAvg = sleepRecords && sleepRecords.length > 0
    ? (sleepRecords.reduce((a, s) => a + s.total_hours, 0) / sleepRecords.length).toFixed(1)
    : null;
  const habitIntegrity = habits && habits.length > 0 && habitLogs && habitLogs.length > 0
    ? Math.round(habitLogs.filter((l) => l.completed).length / (habits.length * 7) * 100)
    : null;

  const autoSummary = [
    `${trainingCount} workouts`,
    `${deepWorkHours}h deep work`,
    sleepAvg ? `${sleepAvg}h avg sleep` : null,
    habitIntegrity !== null ? `${habitIntegrity}% habit integrity` : null,
  ].filter(Boolean).join(" · ");

  return (
    <SitrepClient
      currentSitrep={currentSitrep}
      previousSitrep={previousSitrep}
      weekStart={weekStart}
      autoSummary={autoSummary}
      allSitreps={allSitreps ?? []}
    />
  );
}
