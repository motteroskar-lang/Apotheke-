"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Habit, HabitLog } from "@/types/database";
import { DomainHeader } from "@/components/layout/domain-header";
import { HabitGrid } from "@/components/charts/habit-grid";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn, isoDate, pct } from "@/lib/utils";
import { Plus, Shield, Check, X, MoreHorizontal, Zap } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface Props {
  habits: Habit[];
  habitLogs: HabitLog[];
  discomfortLog: {
    id: string;
    log_date: string;
    description: string;
    category: string;
    intensity: number | null;
  }[];
}

export function DisciplineClient({ habits: initialHabits, habitLogs: initialLogs, discomfortLog }: Props) {
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [logs, setLogs] = useState<HabitLog[]>(initialLogs);
  const [addOpen, setAddOpen] = useState(false);
  const [discomfortOpen, setDiscomfortOpen] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  // New habit form
  const [newHabit, setNewHabit] = useState({
    name: "",
    category: "character",
    is_non_negotiable: false,
  });

  // New discomfort form
  const [discomfortForm, setDiscomfortForm] = useState({
    description: "",
    category: "physical",
    intensity: "7",
    outcome: "",
  });

  const today = isoDate();
  const nonNeg = habits.filter((h) => h.is_non_negotiable);
  const regular = habits.filter((h) => !h.is_non_negotiable);

  // Compute 30-day integrity for a habit
  const integrity30 = (habitId: string) => {
    const completed = logs.filter(
      (l) => l.habit_id === habitId && l.completed
    ).length;
    const total = logs.filter((l) => l.habit_id === habitId).length;
    return total > 0 ? pct(completed, total) : null;
  };

  const overallIntegrity = () => {
    if (nonNeg.length === 0) return null;
    const total = nonNeg.reduce((acc, h) => {
      const pctVal = integrity30(h.id);
      return acc + (pctVal ?? 0);
    }, 0);
    return Math.round(total / nonNeg.length);
  };

  const isCompleted = (habitId: string) =>
    logs.some((l) => l.habit_id === habitId && l.log_date === today && l.completed);

  const handleToggle = async (habit: Habit) => {
    if (toggling) return;
    setToggling(habit.id);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setToggling(null); return; }
    const completed = !isCompleted(habit.id);
    const { data } = await supabase
      .from("habit_logs")
      .upsert({ habit_id: habit.id, user_id: user.id, log_date: today, completed, skipped: false }, { onConflict: "habit_id,log_date" })
      .select().single();
    if (data) {
      setLogs((prev) => [...prev.filter((l) => !(l.habit_id === habit.id && l.log_date === today)), data]);
    }
    setToggling(null);
  };

  const handleAddHabit = async () => {
    if (!newHabit.name.trim()) return;
    if (newHabit.is_non_negotiable && nonNeg.length >= 7) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("habits").insert({
      user_id: user.id,
      name: newHabit.name.trim(),
      category: newHabit.category,
      is_non_negotiable: newHabit.is_non_negotiable,
      frequency: "daily",
      active: true,
    }).select().single();
    if (data) {
      setHabits((prev) => [...prev, data]);
    }
    setNewHabit({ name: "", category: "character", is_non_negotiable: false });
    setAddOpen(false);
  };

  const handleArchiveHabit = async (habitId: string) => {
    const supabase = createClient();
    await supabase.from("habits").update({ active: false }).eq("id", habitId);
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
  };

  const handleLogDiscomfort = async () => {
    if (!discomfortForm.description.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("discomfort_log").insert({
      user_id: user.id,
      log_date: today,
      description: discomfortForm.description,
      category: discomfortForm.category,
      intensity: parseInt(discomfortForm.intensity),
      outcome: discomfortForm.outcome || null,
    });
    setDiscomfortOpen(false);
    setDiscomfortForm({ description: "", category: "physical", intensity: "7", outcome: "" });
  };

  const integrity = overallIntegrity();

  return (
    <div className="animate-fade-in">
      <DomainHeader
        title="Discipline"
        subtitle="Non-negotiables · Habit integrity · Discomfort log"
        accentColor="#EF4444"
        signal={
          integrity !== null
            ? {
                domain: "discipline",
                strength: integrity,
                confidence: 80,
                trend: "stable",
                keyMetric: `${integrity}% habit integrity (30d)`,
              }
            : undefined
        }
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setDiscomfortOpen(true)}>
              <Zap size={12} />
              Log discomfort
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={12} />
              Add habit
            </Button>
          </div>
        }
      />

      {/* Non-negotiables */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-header mb-0">
            Non-Negotiables
            <span className="ml-2 text-apex-text-disabled normal-case tracking-normal">
              ({nonNeg.length}/7)
            </span>
          </h2>
          {integrity !== null && (
            <span className={cn(
              "font-mono text-xs font-medium",
              integrity >= 85 ? "text-apex-green" : integrity >= 60 ? "text-apex-amber" : "text-apex-red"
            )}>
              {integrity}% integrity
            </span>
          )}
        </div>

        {nonNeg.length === 0 ? (
          <div className="border border-dashed border-apex-border rounded-lg p-6 text-center">
            <Shield size={18} className="text-apex-text-disabled mx-auto mb-2" />
            <p className="text-xs text-apex-text-muted">No non-negotiables set</p>
            <button
              onClick={() => setAddOpen(true)}
              className="text-xs text-apex-blue hover:underline mt-1"
            >
              Add one →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {nonNeg.map((habit) => {
              const done = isCompleted(habit.id);
              const int30 = integrity30(habit.id);
              return (
                <div
                  key={habit.id}
                  className="bg-apex-surface border border-apex-border rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(habit)}
                        disabled={toggling === habit.id}
                        className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                          done
                            ? "bg-apex-red border-apex-red"
                            : "border-apex-border hover:border-zinc-500"
                        )}
                      >
                        {done && <Check size={11} className="text-white" strokeWidth={3} />}
                      </button>
                      <span className={cn("text-sm font-medium", done && "text-apex-text-muted")}>
                        {habit.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {int30 !== null && (
                        <span className={cn(
                          "font-mono text-2xs",
                          int30 >= 85 ? "text-apex-green" : int30 >= 60 ? "text-apex-amber" : "text-apex-red"
                        )}>
                          {int30}%
                        </span>
                      )}
                      <HabitMenu onArchive={() => handleArchiveHabit(habit.id)} />
                    </div>
                  </div>
                  <HabitGrid habitId={habit.id} logs={logs} color="#EF4444" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Regular habits */}
      {regular.length > 0 && (
        <div className="mb-8">
          <h2 className="section-header">Regular Habits</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {regular.map((habit) => {
              const done = isCompleted(habit.id);
              const int30 = integrity30(habit.id);
              return (
                <div
                  key={habit.id}
                  className="bg-apex-surface border border-apex-border rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(habit)}
                        className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                          done ? "bg-apex-blue border-apex-blue" : "border-apex-border hover:border-zinc-500"
                        )}
                      >
                        {done && <Check size={11} className="text-white" strokeWidth={3} />}
                      </button>
                      <span className={cn("text-sm", done && "text-apex-text-muted")}>{habit.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {int30 !== null && (
                        <span className={cn(
                          "font-mono text-2xs",
                          int30 >= 85 ? "text-apex-green" : int30 >= 60 ? "text-apex-amber" : "text-apex-red"
                        )}>
                          {int30}%
                        </span>
                      )}
                      <HabitMenu onArchive={() => handleArchiveHabit(habit.id)} />
                    </div>
                  </div>
                  <HabitGrid habitId={habit.id} logs={logs} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Discomfort log */}
      {discomfortLog.length > 0 && (
        <div>
          <h2 className="section-header">Discomfort Log (Recent)</h2>
          <div className="flex flex-col gap-1">
            {discomfortLog.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 py-2 px-3 bg-apex-surface border border-apex-border rounded-md"
              >
                <span className="font-mono text-xs text-apex-text-muted">{entry.log_date}</span>
                <span className="text-xs text-apex-text-primary flex-1">{entry.description}</span>
                {entry.intensity && (
                  <span className="font-mono text-xs text-apex-red">{entry.intensity}/10</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add habit modal */}
      <Modal open={addOpen} onOpenChange={setAddOpen} title="Add Habit">
        <div className="flex flex-col gap-4">
          <Input
            label="Habit name"
            placeholder="e.g. Cold shower, No alcohol..."
            value={newHabit.name}
            onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
            autoFocus
          />
          <Select
            label="Category"
            value={newHabit.category}
            onValueChange={(v) => setNewHabit({ ...newHabit, category: v })}
          >
            <SelectItem value="character">Character</SelectItem>
            <SelectItem value="physical">Physical</SelectItem>
            <SelectItem value="mental">Mental</SelectItem>
            <SelectItem value="financial">Financial</SelectItem>
            <SelectItem value="career">Career</SelectItem>
          </Select>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setNewHabit({ ...newHabit, is_non_negotiable: !newHabit.is_non_negotiable })}
              disabled={!newHabit.is_non_negotiable && nonNeg.length >= 7}
              className={cn(
                "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                newHabit.is_non_negotiable ? "bg-apex-red border-apex-red" : "border-apex-border hover:border-zinc-500"
              )}
            >
              {newHabit.is_non_negotiable && <Check size={11} className="text-white" strokeWidth={3} />}
            </button>
            <div>
              <p className="text-xs text-apex-text-primary">Non-negotiable</p>
              <p className="text-2xs text-apex-text-muted">
                {nonNeg.length >= 7 ? "Limit reached (7/7)" : `${nonNeg.length}/7 used`}
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAddHabit} disabled={!newHabit.name.trim()} className="flex-1">Add habit</Button>
          </div>
        </div>
      </Modal>

      {/* Discomfort modal */}
      <Modal open={discomfortOpen} onOpenChange={setDiscomfortOpen} title="Log Discomfort">
        <div className="flex flex-col gap-4">
          <Textarea
            label="What did you do that was hard?"
            placeholder="Describe the uncomfortable action..."
            value={discomfortForm.description}
            onChange={(e) => setDiscomfortForm({ ...discomfortForm, description: e.target.value })}
            rows={3}
            autoFocus
          />
          <Select
            label="Category"
            value={discomfortForm.category}
            onValueChange={(v) => setDiscomfortForm({ ...discomfortForm, category: v })}
          >
            <SelectItem value="physical">Physical</SelectItem>
            <SelectItem value="social">Social</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="financial">Financial</SelectItem>
            <SelectItem value="emotional">Emotional</SelectItem>
          </Select>
          <Input
            label="Intensity (1–10)"
            type="number"
            min="1"
            max="10"
            value={discomfortForm.intensity}
            onChange={(e) => setDiscomfortForm({ ...discomfortForm, intensity: e.target.value })}
          />
          <Textarea
            label="Outcome (optional)"
            placeholder="What happened as a result?"
            value={discomfortForm.outcome}
            onChange={(e) => setDiscomfortForm({ ...discomfortForm, outcome: e.target.value })}
            rows={2}
          />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setDiscomfortOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleLogDiscomfort} disabled={!discomfortForm.description.trim()} className="flex-1">Log it</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function HabitMenu({ onArchive }: { onArchive: () => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="text-apex-text-disabled hover:text-apex-text-muted p-0.5 rounded transition-colors">
          <MoreHorizontal size={12} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="bg-apex-surface border border-apex-border rounded-lg shadow-xl py-1 min-w-[120px] z-50"
          sideOffset={4}
        >
          <DropdownMenu.Item
            onClick={onArchive}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-apex-red hover:bg-apex-red/10 cursor-pointer outline-none"
          >
            <X size={11} />
            Archive
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
