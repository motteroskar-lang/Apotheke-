"use client";

import { HabitLog } from "@/types/database";
import { cn, isoDate } from "@/lib/utils";
import { format, subDays, parseISO } from "date-fns";
import { Tooltip, TooltipProvider } from "@/components/ui/tooltip";

interface HabitGridProps {
  habitId: string;
  logs: HabitLog[];
  days?: number;
  color?: string;
}

export function HabitGrid({ habitId, logs, days = 30, color = "#3B82F6" }: HabitGridProps) {
  const today = new Date();
  const cells = Array.from({ length: days }, (_, i) => {
    const date = subDays(today, days - 1 - i);
    const dateStr = isoDate(date);
    const log = logs.find(
      (l) => l.habit_id === habitId && l.log_date === dateStr
    );
    return { date, dateStr, log };
  });

  const completedCount = cells.filter((c) => c.log?.completed).length;
  const loggedCount = cells.filter((c) => c.log).length;

  return (
    <TooltipProvider>
      <div>
        <div className="flex gap-0.5 flex-wrap">
          {cells.map(({ date, dateStr, log }) => {
            const status = log
              ? log.completed
                ? "completed"
                : log.skipped
                ? "skipped"
                : "missed"
              : "empty";

            const label = `${format(date, "MMM d")} — ${
              status === "completed"
                ? "completed"
                : status === "skipped"
                ? "skipped"
                : status === "missed"
                ? "missed"
                : "not logged"
            }`;

            return (
              <Tooltip key={dateStr} content={label}>
                <div
                  className={cn(
                    "w-3.5 h-3.5 rounded-sm transition-opacity",
                    status === "empty" && "bg-apex-surface-2"
                  )}
                  style={
                    status === "completed"
                      ? { backgroundColor: color }
                      : status === "skipped"
                      ? { backgroundColor: color, opacity: 0.3 }
                      : status === "missed"
                      ? { backgroundColor: "#EF4444", opacity: 0.4 }
                      : undefined
                  }
                />
              </Tooltip>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-2xs text-apex-text-disabled">30 days</span>
          <span className="text-2xs font-mono text-apex-text-muted">
            {completedCount}/{loggedCount > 0 ? loggedCount : days} logged
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
