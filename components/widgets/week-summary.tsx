import { cn, formatDurationMinutes } from "@/lib/utils";

interface WeekStat {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  good?: boolean;
}

interface WeekSummaryProps {
  stats: WeekStat[];
}

export function WeekSummary({ stats }: WeekSummaryProps) {
  return (
    <div>
      <p className="section-header">Last 7 Days</p>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-apex-surface-2 rounded-md px-3 py-2 flex flex-col gap-0.5"
          >
            <span className="text-2xs text-apex-text-muted uppercase tracking-wider">
              {stat.label}
            </span>
            <span
              className={cn(
                "font-mono text-sm font-medium",
                stat.color ?? "text-apex-text-primary"
              )}
            >
              {stat.value}
            </span>
            {stat.sub && (
              <span className="text-2xs text-apex-text-disabled">{stat.sub}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
