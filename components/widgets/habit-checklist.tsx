"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Habit, HabitLog } from "@/types/database";
import { cn, isoDate } from "@/lib/utils";
import { Check } from "lucide-react";

interface HabitChecklistProps {
  habits: Habit[];
  logs: HabitLog[];
  onUpdate: (logs: HabitLog[]) => void;
}

export function HabitChecklist({ habits, logs, onUpdate }: HabitChecklistProps) {
  const [toggling, setToggling] = useState<string | null>(null);

  const nonNeg = habits.filter((h) => h.is_non_negotiable && h.active);
  const today = isoDate();

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
      .upsert(
        {
          habit_id: habit.id,
          user_id: user.id,
          log_date: today,
          completed,
          skipped: false,
        },
        { onConflict: "habit_id,log_date" }
      )
      .select()
      .single();

    if (data) {
      const next = logs.filter(
        (l) => !(l.habit_id === habit.id && l.log_date === today)
      );
      onUpdate([...next, data]);
    }
    setToggling(null);
  };

  if (nonNeg.length === 0) {
    return (
      <div>
        <p className="section-header">Non-Negotiables</p>
        <p className="text-xs text-apex-text-muted">
          No non-negotiables set.{" "}
          <a href="/discipline" className="text-apex-blue hover:underline">
            Add habits →
          </a>
        </p>
      </div>
    );
  }

  const completedCount = nonNeg.filter((h) => isCompleted(h.id)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="section-header mb-0">Non-Negotiables</p>
        <span className="font-mono text-xs text-apex-text-muted">
          {completedCount}/{nonNeg.length}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {nonNeg.map((habit) => {
          const done = isCompleted(habit.id);
          const active = toggling === habit.id;

          return (
            <button
              key={habit.id}
              onClick={() => handleToggle(habit)}
              disabled={active}
              className={cn(
                "flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-md w-full text-left",
                "transition-all duration-150",
                done
                  ? "opacity-60"
                  : "hover:bg-apex-surface-2"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
                  done
                    ? "bg-apex-green border-apex-green"
                    : "border-apex-border hover:border-zinc-500"
                )}
              >
                {done && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
              <span
                className={cn(
                  "text-sm transition-colors",
                  done ? "text-apex-text-muted line-through" : "text-apex-text-primary"
                )}
              >
                {habit.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
