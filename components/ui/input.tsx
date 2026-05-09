import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="data-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "apex-input",
            error && "border-apex-red/50 focus:ring-apex-red/30",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-apex-red">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="data-label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "apex-input resize-none",
            error && "border-apex-red/50 focus:ring-apex-red/30",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-apex-red">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
