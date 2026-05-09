"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DomainHeader } from "@/components/layout/domain-header";
import { TrendChart } from "@/components/charts/trend-chart";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, DollarSign, Target } from "lucide-react";
import { cn, isoDate, formatCurrency } from "@/lib/utils";
import { computeCompoundProjection } from "@/lib/signals/compute";
import { format, parseISO, startOfMonth } from "date-fns";

interface Snapshot { id: string; snapshot_date: string; net_worth: number; total_assets: number | null; total_liabilities: number | null; cash_savings: number | null; investment_value: number | null; }
interface IncomeStream { id: string; name: string; type: string; is_active: boolean; }
interface IncomeRecord { id: string; stream_id: string; record_month: string; amount: number; income_streams?: { name: string; type: string }; }
interface ExpenseRecord { id: string; record_month: string; category: string; amount: number; }

interface Props {
  snapshots: Snapshot[];
  incomeStreams: IncomeStream[];
  incomeRecords: IncomeRecord[];
  expenseRecords: ExpenseRecord[];
}

type LogModal = "snapshot" | "income" | "expense" | "stream" | null;

export function FinancialClient({ snapshots: initSnapshots, incomeStreams: initStreams, incomeRecords: initIncome, expenseRecords: initExpenses }: Props) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>(initSnapshots);
  const [incomeStreams, setIncomeStreams] = useState<IncomeStream[]>(initStreams);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>(initIncome);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>(initExpenses);
  const [modal, setModal] = useState<LogModal>(null);

  const [snapshotForm, setSnapshotForm] = useState({
    snapshot_date: isoDate(), net_worth: "", total_assets: "", total_liabilities: "",
    cash_savings: "", investment_value: "",
  });

  const [incomeForm, setIncomeForm] = useState({
    stream_id: incomeStreams[0]?.id ?? "", record_month: format(startOfMonth(new Date()), "yyyy-MM-dd"), amount: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    record_month: format(startOfMonth(new Date()), "yyyy-MM-dd"), category: "food", amount: "",
  });

  const [streamForm, setStreamForm] = useState({
    name: "", type: "salary",
  });

  // Latest snapshot
  const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;
  const netWorthDelta = latest && previous ? latest.net_worth - previous.net_worth : null;

  // Monthly income (current month)
  const thisMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthlyIncome = incomeRecords
    .filter((r) => r.record_month === thisMonth)
    .reduce((a, r) => a + r.amount, 0);
  const monthlyExpenses = expenseRecords
    .filter((r) => r.record_month === thisMonth)
    .reduce((a, r) => a + r.amount, 0);
  const savingsRate = monthlyIncome > 0
    ? Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
    : null;

  // Compound projection (8% annual return)
  const monthlyInvestment = latest?.investment_value
    ? (latest.net_worth * 0.3) / 12
    : 5000;
  const projection10yr = latest
    ? computeCompoundProjection(latest.net_worth, monthlyInvestment, 8, 10)
    : null;

  // Chart data
  const netWorthChartData = snapshots.map((s) => ({ date: s.snapshot_date, value: s.net_worth }));

  const handleLogSnapshot = async () => {
    if (!snapshotForm.net_worth) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("financial_snapshots").upsert({
      user_id: user.id,
      snapshot_date: snapshotForm.snapshot_date,
      net_worth: parseFloat(snapshotForm.net_worth),
      total_assets: snapshotForm.total_assets ? parseFloat(snapshotForm.total_assets) : null,
      total_liabilities: snapshotForm.total_liabilities ? parseFloat(snapshotForm.total_liabilities) : null,
      cash_savings: snapshotForm.cash_savings ? parseFloat(snapshotForm.cash_savings) : null,
      investment_value: snapshotForm.investment_value ? parseFloat(snapshotForm.investment_value) : null,
    }, { onConflict: "user_id,snapshot_date" }).select().single();
    if (data) {
      setSnapshots((prev) => {
        const next = prev.filter((s) => s.snapshot_date !== data.snapshot_date);
        return [...next, data].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
      });
    }
    setModal(null);
  };

  const handleLogIncome = async () => {
    if (!incomeForm.amount || !incomeForm.stream_id) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("income_records").upsert({
      user_id: user.id,
      stream_id: incomeForm.stream_id,
      record_month: incomeForm.record_month,
      amount: parseFloat(incomeForm.amount),
    }, { onConflict: "stream_id,record_month" }).select("*, income_streams(name, type)").single();
    if (data) setIncomeRecords((prev) => [data, ...prev.filter((r) => !(r.stream_id === data.stream_id && r.record_month === data.record_month))]);
    setModal(null);
  };

  const handleLogExpense = async () => {
    if (!expenseForm.amount) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("expense_records").upsert({
      user_id: user.id,
      record_month: expenseForm.record_month,
      category: expenseForm.category,
      amount: parseFloat(expenseForm.amount),
    }, { onConflict: "user_id,record_month,category" }).select().single();
    if (data) setExpenseRecords((prev) => [data, ...prev.filter((r) => !(r.record_month === data.record_month && r.category === data.category))]);
    setModal(null);
  };

  const handleAddStream = async () => {
    if (!streamForm.name.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("income_streams").insert({
      user_id: user.id, name: streamForm.name, type: streamForm.type, is_active: true,
    }).select().single();
    if (data) setIncomeStreams((prev) => [...prev, data]);
    setModal(null);
    setStreamForm({ name: "", type: "salary" });
  };

  return (
    <div className="animate-fade-in">
      <DomainHeader
        title="Financial"
        subtitle="Net worth · Income · Savings rate · Compound growth"
        accentColor="#22C55E"
        signal={
          savingsRate !== null
            ? { domain: "financial", strength: Math.min(savingsRate * 2, 100), confidence: 80, trend: "improving", keyMetric: `${savingsRate}% savings rate` }
            : undefined
        }
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => setModal("expense")}>
              <DollarSign size={12} /> Expenses
            </Button>
            <Button size="sm" variant="outline" onClick={() => setModal("income")}>
              <TrendingUp size={12} /> Income
            </Button>
            <Button size="sm" onClick={() => setModal("snapshot")}>
              <Plus size={12} /> Net worth
            </Button>
          </div>
        }
      />

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Net worth",
            value: latest ? formatCurrency(latest.net_worth) : "—",
            sub: netWorthDelta !== null
              ? `${netWorthDelta >= 0 ? "+" : ""}${formatCurrency(netWorthDelta)} vs prev`
              : "no prior snapshot",
            color: netWorthDelta !== null && netWorthDelta >= 0 ? "text-apex-green" : undefined,
          },
          { label: "Monthly income", value: monthlyIncome > 0 ? formatCurrency(monthlyIncome) : "—", sub: `${incomeStreams.length} streams` },
          { label: "Savings rate", value: savingsRate !== null ? `${savingsRate}%` : "—", sub: "this month", color: savingsRate !== null && savingsRate >= 30 ? "text-apex-green" : savingsRate !== null && savingsRate >= 20 ? "text-apex-amber" : undefined },
          { label: "10yr projection", value: projection10yr ? formatCurrency(projection10yr) : "—", sub: "at 8% annual", color: "text-apex-blue" },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <span className="data-label">{s.label}</span>
            <span className={cn("data-value text-base", s.color)}>{s.value}</span>
            <span className="text-2xs text-apex-text-disabled">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Net worth chart */}
      {snapshots.length > 1 && (
        <div className="bg-apex-surface border border-apex-border rounded-lg p-4 mb-6">
          <p className="section-header">Net Worth Trajectory</p>
          <TrendChart data={netWorthChartData} color="#22C55E" height={200} />
        </div>
      )}

      {snapshots.length === 0 && (
        <div className="border border-dashed border-apex-border rounded-lg p-8 text-center mb-6">
          <TrendingUp size={20} className="text-apex-text-disabled mx-auto mb-3" />
          <p className="text-sm text-apex-text-muted mb-1">No net worth data yet</p>
          <p className="text-xs text-apex-text-disabled mb-4">Log your first snapshot to start tracking trajectory.</p>
          <Button size="sm" onClick={() => setModal("snapshot")}>Log net worth now</Button>
        </div>
      )}

      {/* Income vs Expenses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-header mb-0">Income Streams</p>
            <button onClick={() => setModal("stream")} className="text-xs text-apex-blue hover:underline">+ Add stream</button>
          </div>
          {incomeStreams.length === 0 ? (
            <div className="border border-dashed border-apex-border rounded-lg p-4 text-center">
              <p className="text-xs text-apex-text-muted">No income streams</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {incomeStreams.map((stream) => {
                const latestRecord = incomeRecords.find((r) => r.stream_id === stream.id);
                return (
                  <div key={stream.id} className="flex items-center gap-3 py-2 px-3 bg-apex-surface border border-apex-border rounded-md">
                    <Badge variant={stream.type === "salary" ? "blue" : stream.type === "freelance" ? "amber" : stream.type === "dividend" ? "green" : "default"}>
                      {stream.type}
                    </Badge>
                    <span className="text-xs text-apex-text-primary flex-1">{stream.name}</span>
                    {latestRecord && (
                      <span className="font-mono text-xs text-apex-green">
                        {formatCurrency(latestRecord.amount)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="section-header mb-0">Expenses (this month)</p>
            <button onClick={() => setModal("expense")} className="text-xs text-apex-blue hover:underline">+ Log</button>
          </div>
          {monthlyExpenses === 0 ? (
            <div className="border border-dashed border-apex-border rounded-lg p-4 text-center">
              <p className="text-xs text-apex-text-muted">No expenses logged this month</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {expenseRecords.filter((r) => r.record_month === thisMonth).map((expense) => (
                <div key={expense.id} className="flex items-center gap-3 py-2 px-3 bg-apex-surface border border-apex-border rounded-md">
                  <span className="text-xs text-apex-text-secondary capitalize flex-1">{expense.category}</span>
                  <span className="font-mono text-xs text-apex-red">{formatCurrency(expense.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2 px-3 border-t border-apex-border mt-1">
                <span className="text-xs font-medium text-apex-text-secondary">Total</span>
                <span className="font-mono text-xs text-apex-red font-medium">{formatCurrency(monthlyExpenses)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Net worth modal */}
      <Modal open={modal === "snapshot"} onOpenChange={(o) => !o && setModal(null)} title="Log Net Worth">
        <div className="flex flex-col gap-4">
          <Input label="Date" type="date" value={snapshotForm.snapshot_date}
            onChange={(e) => setSnapshotForm({ ...snapshotForm, snapshot_date: e.target.value })} />
          <Input label="Net Worth (total)" type="number" placeholder="50000" value={snapshotForm.net_worth}
            onChange={(e) => setSnapshotForm({ ...snapshotForm, net_worth: e.target.value })} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Total assets" type="number" placeholder="60000" value={snapshotForm.total_assets}
              onChange={(e) => setSnapshotForm({ ...snapshotForm, total_assets: e.target.value })} />
            <Input label="Total liabilities" type="number" placeholder="10000" value={snapshotForm.total_liabilities}
              onChange={(e) => setSnapshotForm({ ...snapshotForm, total_liabilities: e.target.value })} />
            <Input label="Cash savings" type="number" placeholder="20000" value={snapshotForm.cash_savings}
              onChange={(e) => setSnapshotForm({ ...snapshotForm, cash_savings: e.target.value })} />
            <Input label="Investment value" type="number" placeholder="30000" value={snapshotForm.investment_value}
              onChange={(e) => setSnapshotForm({ ...snapshotForm, investment_value: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleLogSnapshot} disabled={!snapshotForm.net_worth} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>

      {/* Income modal */}
      <Modal open={modal === "income"} onOpenChange={(o) => !o && setModal(null)} title="Log Income">
        <div className="flex flex-col gap-4">
          {incomeStreams.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-apex-text-muted mb-3">No income streams configured.</p>
              <Button size="sm" onClick={() => setModal("stream")}>Add income stream</Button>
            </div>
          ) : (
            <>
              <Select label="Income stream" value={incomeForm.stream_id} onValueChange={(v) => setIncomeForm({ ...incomeForm, stream_id: v })}>
                {incomeStreams.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </Select>
              <Input label="Month" type="date" value={incomeForm.record_month}
                onChange={(e) => setIncomeForm({ ...incomeForm, record_month: e.target.value })} />
              <Input label="Amount" type="number" placeholder="50000" value={incomeForm.amount}
                onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })} autoFocus />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
                <Button onClick={handleLogIncome} disabled={!incomeForm.amount || !incomeForm.stream_id} className="flex-1">Save</Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Expense modal */}
      <Modal open={modal === "expense"} onOpenChange={(o) => !o && setModal(null)} title="Log Expenses">
        <div className="flex flex-col gap-4">
          <Input label="Month" type="date" value={expenseForm.record_month}
            onChange={(e) => setExpenseForm({ ...expenseForm, record_month: e.target.value })} />
          <Select label="Category" value={expenseForm.category} onValueChange={(v) => setExpenseForm({ ...expenseForm, category: v })}>
            <SelectItem value="housing">Housing</SelectItem>
            <SelectItem value="food">Food</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
            <SelectItem value="health">Health</SelectItem>
            <SelectItem value="education">Education</SelectItem>
            <SelectItem value="entertainment">Entertainment</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </Select>
          <Input label="Amount" type="number" placeholder="8000" value={expenseForm.amount}
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} autoFocus />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleLogExpense} disabled={!expenseForm.amount} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>

      {/* Stream modal */}
      <Modal open={modal === "stream"} onOpenChange={(o) => !o && setModal(null)} title="Add Income Stream">
        <div className="flex flex-col gap-4">
          <Input label="Name" placeholder="e.g. Main job, Freelance writing..." value={streamForm.name}
            onChange={(e) => setStreamForm({ ...streamForm, name: e.target.value })} autoFocus />
          <Select label="Type" value={streamForm.type} onValueChange={(v) => setStreamForm({ ...streamForm, type: v })}>
            <SelectItem value="salary">Salary</SelectItem>
            <SelectItem value="freelance">Freelance</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="dividend">Dividend</SelectItem>
            <SelectItem value="rental">Rental</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleAddStream} disabled={!streamForm.name.trim()} className="flex-1">Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
