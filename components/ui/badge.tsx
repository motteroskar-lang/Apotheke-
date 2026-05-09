import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type BadgeVariant = "default" | "blue" | "green" | "amber" | "red" | "purple" | "cyan";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-zinc-800 text-apex-text-secondary border-apex-border",
  blue:   "bg-apex-blue/10 text-apex-blue border-apex-blue/20",
  green:  "bg-apex-green/10 text-apex-green border-apex-green/20",
  amber:  "bg-apex-amber/10 text-apex-amber border-apex-amber/20",
  red:    "bg-apex-red/10 text-apex-red border-apex-red/20",
  purple: "bg-apex-purple/10 text-apex-purple border-apex-purple/20",
  cyan:   "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium border",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
