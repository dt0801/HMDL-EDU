"use client";

import { Fragment } from "react";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
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
    <div
      className={cn(
        "mx-auto w-full max-w-xl rounded-2xl border border-border/60 bg-muted/30 px-4 py-5 shadow-sm sm:max-w-2xl sm:px-6",
        className
      )}
    >
      <ol className="flex w-full items-start">
        {items.map((s, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isDisabled = !!s.disabled;
          const lineDone = idx < currentIdx;

          return (
            <Fragment key={s.key}>
              <li className="flex min-w-0 flex-1 flex-col items-center text-center">
                <Button
                  type="button"
                  disabled={!onValueChange || isDisabled}
                  onClick={() => onValueChange?.(s.key)}
                  variant="ghost"
                  className={cn(
                    "h-auto w-full max-w-[8rem] flex-col items-center gap-1.5 p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    onValueChange && !isDisabled ? "cursor-pointer" : "cursor-default"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                      isDone
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCurrent
                          ? "border-primary bg-background text-primary ring-2 ring-primary/25"
                          : "border-muted-foreground/35 bg-background text-muted-foreground"
                    )}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "text-[11px] font-medium leading-tight sm:text-xs",
                        isCurrent ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {s.label}
                    </div>
                    {s.description ? (
                      <div className="mt-0.5 hidden text-[10px] leading-snug text-muted-foreground sm:block sm:text-[11px]">
                        {s.description}
                      </div>
                  ) : null}
                  </div>
                </Button>
              </li>

              {idx < items.length - 1 ? (
                <li className="flex flex-1 items-center px-1 pt-[18px] sm:px-2" aria-hidden>
                  <div
                    className={cn(
                      "h-[2px] w-full min-w-[1.25rem] rounded-full transition-colors",
                      lineDone ? "bg-primary" : "bg-muted"
                    )}
                  />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}
