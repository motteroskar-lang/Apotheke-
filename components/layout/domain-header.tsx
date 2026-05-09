import { cn, signalColor, trendIcon } from "@/lib/utils";
import { DomainSignal } from "@/types/domain";

interface DomainHeaderProps {
  title: string;
  subtitle?: string;
  signal?: DomainSignal;
  accentColor?: string;
  actions?: React.ReactNode;
}

export function DomainHeader({
  title,
  subtitle,
  signal,
  accentColor = "#3B82F6",
  actions,
}: DomainHeaderProps) {
  return (
    <div className="flex items-start justify-between pb-5 border-b border-apex-border mb-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-apex-text-primary uppercase tracking-widest">
            {title}
          </h1>
          {signal && (
            <div className="flex items-center gap-2">
              <div className="w-16 h-0.5 bg-apex-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${signal.strength}%`,
                    backgroundColor: accentColor,
                  }}
                />
              </div>
              <span
                className={cn("font-mono text-xs font-medium", signalColor(signal.strength))}
              >
                {signal.strength}%
              </span>
              <span className="text-apex-text-muted text-xs">
                {trendIcon(signal.trend)}
              </span>
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-apex-text-muted">{subtitle}</p>
        )}
        {signal?.keyMetric && (
          <p className="text-xs text-apex-text-secondary font-mono mt-0.5">
            {signal.keyMetric}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
