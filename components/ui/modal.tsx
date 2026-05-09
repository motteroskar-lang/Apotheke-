"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  size = "md",
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "bg-apex-surface border border-apex-border rounded-xl shadow-2xl",
            "w-full mx-4 animate-slide-up",
            sizeClasses[size],
            className
          )}
        >
          {(title || description) && (
            <div className="flex items-start justify-between p-5 border-b border-apex-border">
              <div>
                {title && (
                  <Dialog.Title className="text-sm font-semibold text-apex-text-primary">
                    {title}
                  </Dialog.Title>
                )}
                {description && (
                  <Dialog.Description className="text-xs text-apex-text-muted mt-1">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close className="text-apex-text-muted hover:text-apex-text-primary transition-colors ml-4 flex-shrink-0">
                <X size={14} />
              </Dialog.Close>
            </div>
          )}
          <div className="p-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
