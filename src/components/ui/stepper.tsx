"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type StepperItem = {
  key: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export function Stepper({
  items,
  value,
  onValueChange,
  className,
}: {
  items: StepperItem[];
  value: string;
  onValueChange?: (key: string) => void;
  className?: string;
}) {
  const currentIdx = Math.max(
    0,
    items.findIndex((s) => s.key === value)
  );

  return (
    <div className={cn("w-full", className)}>
      <ol className="grid grid-cols-3 gap-3 sm:gap-4">
        {items.map((s, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isDisabled = !!s.disabled;

          return (
            <li key={s.key} className="min-w-0">
              <button
                type="button"
                disabled={!onValueChange || isDisabled}
                onClick={() => onValueChange?.(s.key)}
                className={cn(
                  "group w-full text-left disabled:cursor-not-allowed disabled:opacity-60",
                  onValueChange ? "cursor-pointer" : "cursor-default"
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold",
                        isDone
                          ? "border-primary bg-primary text-primary-foreground"
                          : isCurrent
                            ? "border-primary bg-background text-primary"
                            : "border-muted-foreground/30 bg-background text-muted-foreground"
                      )}
                    >
                      {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                    </div>

                    {idx < items.length - 1 ? (
                      <div
                        className={cn(
                          "absolute left-full top-1/2 hidden h-[2px] w-[calc(100%+0.75rem)] -translate-y-1/2 sm:block",
                          idx < currentIdx ? "bg-primary" : "bg-muted"
                        )}
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <div
                      className={cn(
                        "truncate text-sm font-medium",
                        isCurrent ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      {s.label}
                    </div>
                    {s.description ? (
                      <div className="truncate text-xs text-muted-foreground">{s.description}</div>
                    ) : null}
                  </div>
                </div>

                {/* Mobile connector */}
                {idx < items.length - 1 ? (
                  <div className="mt-3 h-[2px] w-full bg-muted sm:hidden">
                    <div
                      className={cn("h-full", idx < currentIdx ? "bg-primary" : "bg-transparent")}
                      style={{ width: idx < currentIdx ? "100%" : "0%" }}
                    />
                  </div>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

