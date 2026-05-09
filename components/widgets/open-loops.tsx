import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Loop {
  message: string;
  href: string;
  severity: "warning" | "info";
}

interface OpenLoopsProps {
  loops: Loop[];
}

export function OpenLoops({ loops }: OpenLoopsProps) {
  if (loops.length === 0) return null;

  return (
    <div>
      <p className="section-header">Open Loops</p>
      <div className="flex flex-col gap-1">
        {loops.map((loop, i) => (
          <Link
            key={i}
            href={loop.href}
            className={cn(
              "flex items-start gap-2.5 py-1.5 px-2 -mx-2 rounded-md text-xs",
              "hover:bg-apex-surface-2 transition-colors group"
            )}
          >
            <AlertTriangle
              size={12}
              className={cn(
                "flex-shrink-0 mt-0.5",
                loop.severity === "warning"
                  ? "text-apex-amber"
                  : "text-apex-text-muted"
              )}
            />
            <span className="text-apex-text-secondary group-hover:text-apex-text-primary transition-colors">
              {loop.message}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
