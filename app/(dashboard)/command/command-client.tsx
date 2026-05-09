"use client";

import { useState } from "react";
import { Profile, DailyBrief, Habit, HabitLog } from "@/types/database";
import { SystemStatus } from "@/components/widgets/system-status";
import { MissionBrief } from "@/components/widgets/mission-brief";
import { HabitChecklist } from "@/components/widgets/habit-checklist";
import { OpenLoops } from "@/components/widgets/open-loops";
import { WeekSummary } from "@/components/widgets/week-summary";
import { buildMockSignal } from "@/lib/signals/compute";
import { DOMAIN_META } from "@/types/domain";

interface Props {
  profile: Profile | null;
  brief: DailyBrief | null;
  habits: Habit[];
  habitLogs: HabitLog[];
  openLoops: { message: string; href: string; severity: "warning" | "info" }[];
  weekStats: { label: string; value: string; color?: string }[];
  dateLabel: string;
  weekNum: number;
  quarter: number;
  year: number;
}

export function CommandClient({
  profile,
  brief: initialBrief,
  habits,
  habitLogs: initialLogs,
  openLoops,
  weekStats,
  dateLabel,
  weekNum,
  quarter,
  year,
}: Props) {
  const [brief, setBrief] = useState<DailyBrief | null>(initialBrief);
  const [logs, setLogs] = useState<HabitLog[]>(initialLogs);

  const signals = DOMAIN_META.map((m) => buildMockSignal(m.id));

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xs font-semibold uppercase tracking-widest text-apex-text-primary">
              {dateLabel}
            </h1>
            <span className="text-apex-text-disabled text-xs font-mono">
              WK {weekNum} / Q{quarter} {year}
            </span>
          </div>
          {profile?.identity_statement && (
            <p className="text-xs text-apex-text-muted mt-0.5 italic max-w-lg truncate">
              {profile.identity_statement}
            </p>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left col */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Mission brief */}
          <div className="bg-apex-surface border border-apex-border rounded-lg p-4">
            <MissionBrief brief={brief} onUpdate={setBrief} />
          </div>

          {/* Week summary */}
          <div className="bg-apex-surface border border-apex-border rounded-lg p-4">
            <WeekSummary stats={weekStats} />
          </div>

          {/* System status */}
          <div className="bg-apex-surface border border-apex-border rounded-lg p-4">
            <SystemStatus signals={signals} />
          </div>
        </div>

        {/* Right col */}
        <div className="flex flex-col gap-5">
          {/* Non-negotiables */}
          <div className="bg-apex-surface border border-apex-border rounded-lg p-4">
            <HabitChecklist
              habits={habits}
              logs={logs}
              onUpdate={setLogs}
            />
          </div>

          {/* Open loops */}
          {openLoops.length > 0 && (
            <div className="bg-apex-surface border border-apex-border rounded-lg p-4">
              <OpenLoops loops={openLoops} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
