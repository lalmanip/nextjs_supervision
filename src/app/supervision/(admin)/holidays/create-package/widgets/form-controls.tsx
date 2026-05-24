"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

/** Hides native number input spinners (up/down arrows). */
export const numberInputNoSpinnerClass =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export const fieldClass =
  "flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950";

export const textareaClass =
  "flex min-h-[80px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950";

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  /** Grey example text shown beside the label (stays visible while typing). */
  hint?: string;
  error?: string;
  /** Shows a red asterisk after the label. */
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <Label htmlFor={htmlFor}>
          {label}
          {required ? (
            <span className="text-red-600 dark:text-red-400" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </Label>
        {hint ? (
          <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">{hint}</span>
        ) : null}
      </div>
      {children}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function NumberStepperInput({
  id,
  value,
  onChange,
  min,
  max,
  disabled,
  "aria-label": ariaLabel,
}: {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max?: number;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const clamp = React.useCallback(
    (next: number) => {
      const cappedMax = max != null ? Math.min(max, next) : next;
      return Math.max(min, cappedMax);
    },
    [min, max]
  );

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      onChange(min);
      return;
    }
    onChange(clamp(parsed));
  };

  const decrement = () => onChange(clamp(value - 1));
  const increment = () => onChange(clamp(value + 1));

  return (
    <div className="flex items-stretch gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0"
        disabled={disabled || value <= min}
        aria-label={`Decrease ${ariaLabel ?? "value"}`}
        onClick={decrement}
      >
        −
      </Button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(fieldClass, numberInputNoSpinnerClass, "text-center")}
        value={value}
        min={min}
        max={max}
        onChange={(e) => commit(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0"
        disabled={disabled || (max != null && value >= max)}
        aria-label={`Increase ${ariaLabel ?? "value"}`}
        onClick={increment}
      >
        +
      </Button>
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-zinc-300 accent-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
