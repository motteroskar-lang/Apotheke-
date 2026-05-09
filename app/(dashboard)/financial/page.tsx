import { createClient } from "@/lib/supabase/server";
import { FinancialClient } from "./financial-client";

export default async function FinancialPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: snapshots },
    { data: incomeStreams },
    { data: incomeRecords },
    { data: expenseRecords },
  ] = await Promise.all([
    supabase
      .from("financial_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .order("snapshot_date", { ascending: true }),
    supabase
      .from("income_streams")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true),
    supabase
      .from("income_records")
      .select("*, income_streams(name, type)")
      .eq("user_id", user.id)
      .order("record_month", { ascending: false })
      .limit(24),
    supabase
      .from("expense_records")
      .select("*")
      .eq("user_id", user.id)
      .order("record_month", { ascending: false })
      .limit(24),
  ]);

  return (
    <FinancialClient
      snapshots={snapshots ?? []}
      incomeStreams={incomeStreams ?? []}
      incomeRecords={incomeRecords ?? []}
      expenseRecords={expenseRecords ?? []}
    />
  );
}
