"use client";

import { CalendarRange } from "lucide-react";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { addDays, format, isValid, subDays } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function formatDateMaybe(value: Date) {
  if (!isValid(value)) return "";
  return format(value, "dd/MM/yyyy");
}

export function DateRangePicker({
  value,
  onChange,
  disabled,
  className,
}: {
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const label = useMemo(() => {
    if (value?.from && value?.to) {
      return `${formatDateMaybe(value.from)} - ${formatDateMaybe(value.to)}`;
    }
    if (value?.from) return formatDateMaybe(value.from);
    return "Chọn khoảng ngày";
  }, [value?.from, value?.to]);

  const presets = useMemo(
    () => [
      { key: "7d", label: "7 ngày", range: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
      { key: "30d", label: "30 ngày", range: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
      { key: "90d", label: "90 ngày", range: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
      { key: "next90", label: "3 tháng tới", range: () => ({ from: new Date(), to: addDays(new Date(), 90) }) },
    ],
    []
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-start text-left font-normal", !value?.from && "text-muted-foreground", className)}
        >
          <CalendarRange className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col gap-3 p-3">
          <Calendar
            mode="range"
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
          />
          <div className="flex flex-wrap gap-2 border-t pt-3">
            {presets.map((preset) => (
              <Button
                key={preset.key}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onChange(preset.range());
                  setOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => onChange(undefined)}
            >
              Xóa
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

