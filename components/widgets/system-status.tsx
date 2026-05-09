"use client";

import Link from "next/link";
import { DomainSignal, DOMAIN_META } from "@/types/domain";
import { cn, signalColor, trendIcon } from "@/lib/utils";

interface SystemStatusProps {
  signals: DomainSignal[];
}

export function SystemStatus({ signals }: SystemStatusProps) {
  return (
    <div>
      <p className="section-header">System Status</p>
      <div className="flex flex-col gap-1">
        {DOMAIN_META.map((meta) => {
          const signal = signals.find((s) => s.domain === meta.id);
          const strength = signal?.strength ?? 0;
          const hasData = signal && signal.confidence > 0;

          return (
            <Link
              key={meta.id}
              href={meta.href}
              className="flex items-center gap-3 py-1.5 group hover:bg-apex-surface-2 rounded-md px-2 -mx-2 transition-colors"
            >
              <span className="text-xs text-apex-text-muted w-20 flex-shrink-0 group-hover:text-apex-text-secondary transition-colors">
                {meta.label}
              </span>

              <div className="flex-1 h-0.5 bg-apex-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: hasData ? `${strength}%` : "0%",
                    backgroundColor: meta.color,
                    opacity: hasData ? 1 : 0.3,
                  }}
                />
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0 w-20 justify-end">
                {hasData ? (
                  <>
                    <span className={cn("font-mono text-xs", signalColor(strength))}>
                      {strength}%
                    </span>
                    <span className="text-apex-text-disabled text-xs">
                      {trendIcon(signal.trend)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xs text-apex-text-disabled">
                    no data
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
