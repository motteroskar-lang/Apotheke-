"use client";

import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed rounded-md",
          {
            "bg-apex-blue hover:bg-blue-500 text-white": variant === "primary",
            "text-apex-text-secondary hover:text-apex-text-primary hover:bg-apex-surface-2":
              variant === "ghost",
            "border border-apex-border hover:border-zinc-600 text-apex-text-secondary hover:text-apex-text-primary":
              variant === "outline",
            "bg-apex-red/10 hover:bg-apex-red/20 text-apex-red border border-apex-red/20":
              variant === "destructive",
          },
          {
            "px-2.5 py-1.5 text-xs": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-5 py-2.5 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
