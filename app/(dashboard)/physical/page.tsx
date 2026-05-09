import { createClient } from "@/lib/supabase/server";
import { PhysicalClient } from "./physical-client";
import { daysAgo, isoDate } from "@/lib/utils";

export default async function PhysicalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const thirtyDaysAgo = daysAgo(30);
  const ninetyDaysAgo = daysAgo(90);

  const [
    { data: workouts },
    { data: runs },
    { data: sleepRecords },
    { data: bodyMeasurements },
  ] = await Promise.all([
    supabase
      .from("workouts")
      .select("*, workout_sets(*)")
      .eq("user_id", user.id)
      .gte("workout_date", thirtyDaysAgo)
      .order("workout_date", { ascending: false }),
    supabase
      .from("running_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("session_date", thirtyDaysAgo)
      .order("session_date", { ascending: false }),
    supabase
      .from("sleep_records")
      .select("*")
      .eq("user_id", user.id)
      .gte("sleep_date", thirtyDaysAgo)
      .order("sleep_date", { ascending: true }),
    supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", user.id)
      .gte("measured_at", ninetyDaysAgo)
      .order("measured_at", { ascending: true }),
  ]);

  return (
    <PhysicalClient
      workouts={workouts ?? []}
      runs={runs ?? []}
      sleepRecords={sleepRecords ?? []}
      bodyMeasurements={bodyMeasurements ?? []}
    />
  );
}
