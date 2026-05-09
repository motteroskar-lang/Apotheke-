import { createClient } from "@/lib/supabase/server";
import { MentalClient } from "./mental-client";
import { daysAgo } from "@/lib/utils";

export default async function MentalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const thirtyDaysAgo = daysAgo(30);

  const [
    { data: deepWork },
    { data: reading },
    { data: journal },
  ] = await Promise.all([
    supabase
      .from("deep_work_sessions")
      .select("*")
      .eq("user_id", user.id)
      .gte("session_date", thirtyDaysAgo)
      .order("session_date", { ascending: false }),
    supabase
      .from("reading_log")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .gte("entry_date", thirtyDaysAgo)
      .order("entry_date", { ascending: false })
      .limit(10),
  ]);

  return (
    <MentalClient
      deepWork={deepWork ?? []}
      reading={reading ?? []}
      journal={journal ?? []}
    />
  );
}
