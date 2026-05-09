"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Goal } from "@/types/database";
import { DomainHeader } from "@/components/layout/domain-header";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Check, Trophy } from "lucide-react";
import { cn, isoDate } from "@/lib/utils";

interface Props {
  identityStatement: string | null;
  goals: Goal[];
  values: { id: string; value: string; rank: number | null }[];
  pillars: { id: string; pillar: string; category: string }[];
}

const HORIZON_ORDER = ["life", "decade", "annual", "quarterly", "monthly"];
const HORIZON_LABELS: Record<string, string> = {
  life: "Life goals",
  decade: "10-year vision",
  annual: `${new Date().getFullYear()} targets`,
  quarterly: `Q${Math.floor(new Date().getMonth() / 3) + 1} objectives`,
  monthly: "This month",
};

export function VisionClient({ identityStatement, goals: initGoals, values, pillars }: Props) {
  const [goals, setGoals] = useState<Goal[]>(initGoals);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", category: "vision", horizon: "annual",
    year: String(new Date().getFullYear()), target_date: "",
  });

  const byHorizon = HORIZON_ORDER.reduce<Record<string, Goal[]>>((acc, h) => {
    acc[h] = goals.filter((g) => g.horizon === h);
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("goals").insert({
      user_id: user.id,
      title: form.title,
      description: form.description || null,
      category: form.category,
      horizon: form.horizon,
      year: form.year ? parseInt(form.year) : null,
      target_date: form.target_date || null,
      status: "active",
    }).select().single();
    if (data) setGoals((prev) => [...prev, data]);
    setAddOpen(false);
    setForm({ title: "", description: "", category: "vision", horizon: "annual", year: String(new Date().getFullYear()), target_date: "" });
  };

  const handleAchieve = async (goalId: string) => {
    const supabase = createClient();
    await supabase.from("goals").update({ status: "achieved" }).eq("id", goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
  };

  return (
    <div className="animate-fade-in">
      <DomainHeader
        title="Vision"
        subtitle="Identity · Values · Goals · Long-term trajectory"
        accentColor="#06B6D4"
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={12} /> Add goal
          </Button>
        }
      />

      {/* Identity statement */}
      {identityStatement && (
        <div className="bg-apex-surface-2 border border-apex-border rounded-lg px-5 py-4 mb-6">
          <p className="section-header mb-1">Identity</p>
          <p className="text-sm text-apex-text-primary italic">{identityStatement}</p>
        </div>
      )}

      {/* Values */}
      {values.length > 0 && (
        <div className="mb-6">
          <p className="section-header">Core Values</p>
          <div className="flex flex-wrap gap-2">
            {values.map((v) => (
              <span
                key={v.id}
                className="px-3 py-1 bg-cyan-500/5 border border-cyan-500/20 rounded-md text-xs text-cyan-400"
              >
                {v.value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Goals by horizon */}
      {HORIZON_ORDER.map((horizon) => {
        const horizonGoals = byHorizon[horizon] ?? [];
        if (horizonGoals.length === 0 && horizon !== "annual") return null;
        return (
          <div key={horizon} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="section-header mb-0">{HORIZON_LABELS[horizon]}</p>
              <button
                onClick={() => {
                  setForm((prev) => ({ ...prev, horizon }));
                  setAddOpen(true);
                }}
                className="text-xs text-apex-blue hover:underline"
              >
                + Add
              </button>
            </div>

            {horizonGoals.length === 0 ? (
              <div className="border border-dashed border-apex-border rounded-md px-4 py-3">
                <p className="text-xs text-apex-text-disabled">No {horizon} goals set</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {horizonGoals.map((goal) => (
                  <div key={goal.id} className="flex items-start gap-3 py-2 px-3 bg-apex-surface border border-apex-border rounded-md group">
                    <button
                      onClick={() => handleAchieve(goal.id)}
                      className="w-4 h-4 rounded border border-apex-border hover:border-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors group-hover:border-cyan-400/50"
                    >
                      <Check size={10} className="text-transparent group-hover:text-cyan-400/30 transition-colors" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-apex-text-primary">{goal.title}</p>
                      {goal.description && (
                        <p className="text-xs text-apex-text-muted mt-0.5">{goal.description}</p>
                      )}
                    </div>
                    <Badge variant={
                      goal.category === "financial" ? "green"
                      : goal.category === "physical" ? "blue"
                      : goal.category === "mental" ? "purple"
                      : goal.category === "character" ? "red"
                      : "cyan"
                    }>
                      {goal.category}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Add goal modal */}
      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Goal">
        <div className="flex flex-col gap-4">
          <Input label="Goal" placeholder="What will you achieve?" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
          <Textarea label="Description (optional)" placeholder="Context, constraints, why it matters..." value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Horizon" value={form.horizon} onValueChange={(v) => setForm({ ...form, horizon: v })}>
              <SelectItem value="life">Life</SelectItem>
              <SelectItem value="decade">10 years</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </Select>
            <Select label="Category" value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="physical">Physical</SelectItem>
              <SelectItem value="mental">Mental</SelectItem>
              <SelectItem value="career">Career</SelectItem>
              <SelectItem value="character">Character</SelectItem>
              <SelectItem value="vision">Vision</SelectItem>
            </Select>
          </div>
          {(form.horizon === "annual" || form.horizon === "quarterly") && (
            <Input label="Target date" type="date" value={form.target_date}
              onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.title.trim()} className="flex-1">Add goal</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
