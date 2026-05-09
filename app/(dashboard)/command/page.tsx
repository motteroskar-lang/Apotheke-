import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { CommandClient } from "./command-client";
import { isoDate, daysAgo, getWeekNumber, getQuarter } from "@/lib/utils";

export default async function CommandPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const today = isoDate();
  const sevenDaysAgo = daysAgo(7);

  const [
    { data: profile },
    { data: brief },
    { data: habits },
    { data: habitLogs },
    { data: workouts },
    { data: sleepRecords },
    { data: deepWork },
    { data: snapshots },
    { data: sitrep },
    { data: bodyMeasurements },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("daily_briefs")
      .select("*")
      .eq("user_id", user.id)
      .eq("brief_date", today)
      .maybeSingle(),
    supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("is_non_negotiable", { ascending: false }),
    supabase
      .from("habit_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("log_date", sevenDaysAgo),
    supabase
      .from("workouts")
      .select("*")
      .eq("user_id", user.id)
      .gte("workout_date", sevenDaysAgo),
    supabase
      .from("sleep_records")
      .select("*")
      .eq("user_id", user.id)
      .gte("sleep_date", sevenDaysAgo),
    supabase
      .from("deep_work_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("session_date", sevenDaysAgo),
    supabase
      .from("financial_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .order("snapshot_date", { ascending: false })
      .limit(2),
    supabase
      .from("weekly_sitrep")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed", false)
      .limit(1),
    supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", user.id)
      .order("measured_at", { ascending: false })
      .limit(1),
  ]);

  // Compute open loops
  const openLoops: { message: string; href: string; severity: "warning" | "info" }[] = [];

  if (sitrep && sitrep.length > 0) {
    openLoops.push({
      message: "Weekly SITREP incomplete — due Sunday",
      href: "/sitrep",
      severity: "warning",
    });
  }

  if (!bodyMeasurements || bodyMeasurements.length === 0) {
    openLoops.push({
      message: "Body measurements — never logged",
      href: "/physical/body",
      severity: "info",
    });
  } else {
    const daysSinceBody = Math.floor(
      (new Date().getTime() -
        new Date(bodyMeasurements[0].measured_at).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSinceBody > 10) {
      openLoops.push({
        message: `Body measurements — last logged ${daysSinceBody} days ago`,
        href: "/physical/body",
        severity: "info",
      });
    }
  }

  if (!snapshots || snapshots.length === 0) {
    openLoops.push({
      message: "Net worth — never logged",
      href: "/financial",
      severity: "info",
    });
  } else {
    const daysSinceSnap = Math.floor(
      (new Date().getTime() -
        new Date(snapshots[0].snapshot_date).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSinceSnap > 7) {
      openLoops.push({
        message: `Net worth — last updated ${daysSinceSnap} days ago`,
        href: "/financial",
        severity: "info",
      });
    }
  }

  // Week stats
  const trainingCount = workouts?.length ?? 0;
  const deepWorkMins =
    deepWork?.reduce((a, s) => a + s.duration_minutes, 0) ?? 0;
  const sleepAvg =
    sleepRecords && sleepRecords.length > 0
      ? (sleepRecords.reduce((a, s) => a + s.total_hours, 0) / sleepRecords.length).toFixed(1)
      : null;
  const netWorthDelta =
    snapshots && snapshots.length >= 2
      ? snapshots[0].net_worth - snapshots[1].net_worth
      : null;

  const totalHabits =
    habits?.filter((h) => h.is_non_negotiable).length ?? 0;
  const completedHabits =
    habitLogs?.filter((l) => l.completed).length ?? 0;
  const habitIntegrity =
    totalHabits > 0 && habitLogs
      ? Math.round((completedHabits / (totalHabits * 7)) * 100)
      : null;

  const weekStats = [
    { label: "Training", value: `${trainingCount}/5`, color: trainingCount >= 5 ? "text-apex-green" : trainingCount >= 3 ? "text-apex-amber" : "text-apex-red" },
    { label: "Deep Work", value: `${Math.round(deepWorkMins / 60)}h` },
    { label: "Sleep avg", value: sleepAvg ? `${sleepAvg}h` : "—", color: sleepAvg && parseFloat(sleepAvg) >= 7 ? "text-apex-green" : sleepAvg ? "text-apex-amber" : undefined },
    { label: "Habits", value: habitIntegrity !== null ? `${habitIntegrity}%` : "—", color: habitIntegrity !== null && habitIntegrity >= 85 ? "text-apex-green" : habitIntegrity !== null && habitIntegrity >= 60 ? "text-apex-amber" : habitIntegrity !== null ? "text-apex-red" : undefined },
  ];

  const dateLabel = format(new Date(), "EEE dd MMM").toUpperCase();
  const weekNum = getWeekNumber();
  const quarter = getQuarter();
  const year = new Date().getFullYear();

  return (
    <CommandClient
      profile={profile}
      brief={brief}
      habits={habits ?? []}
      habitLogs={habitLogs ?? []}
      openLoops={openLoops}
      weekStats={weekStats}
      dateLabel={dateLabel}
      weekNum={weekNum}
      quarter={quarter}
      year={year}
    />
  );
}
