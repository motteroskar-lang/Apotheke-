"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export function Select({
  value,
  onValueChange,
  placeholder,
  label,
  children,
  className,
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="data-label">{label}</span>}
      <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
        <SelectPrimitive.Trigger
          className={cn(
            "apex-input flex items-center justify-between gap-2",
            className
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <ChevronDown size={12} className="text-apex-text-muted flex-shrink-0" />
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="bg-apex-surface border border-apex-border rounded-lg shadow-xl overflow-hidden z-50 min-w-[160px]"
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.Viewport className="p-1">
              {children}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

export function SelectItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <SelectPrimitive.Item
      value={value}
      className="relative flex items-center gap-2 px-3 py-2 text-sm text-apex-text-secondary hover:text-apex-text-primary hover:bg-apex-surface-2 rounded-md cursor-pointer outline-none data-[highlighted]:bg-apex-surface-2 data-[highlighted]:text-apex-text-primary"
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2">
        <Check size={10} className="text-apex-blue" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}
