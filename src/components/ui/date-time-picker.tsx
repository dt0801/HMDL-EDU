"use client";

import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

function toLocalDateTimeInput(date: Date) {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function parseLocalDateTime(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad2(num: number) {
  return String(num).padStart(2, "0");
}

export function DateTimePicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const selectedDate = useMemo(() => parseLocalDateTime(value), [value]);
  const [open, setOpen] = useState(false);

  const timeValue = useMemo(() => {
    const d = selectedDate ?? new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }, [selectedDate]);

  const updateDate = (next: Date) => {
    onChange(toLocalDateTimeInput(next));
  };

  const handlePickDay = (day: Date | undefined) => {
    if (!day) return;
    const base = selectedDate ?? new Date();
    const next = new Date(day);
    next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    updateDate(next);
    setOpen(false);
  };

  const handlePickTime = (nextTime: string) => {
    const [hRaw, mRaw] = nextTime.split(":");
    const hour = Number(hRaw);
    const minute = Number(mRaw);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return;

    const base = selectedDate ?? new Date();
    const next = new Date(base);
    next.setHours(hour, minute, 0, 0);
    updateDate(next);
  };

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? formatDate(selectedDate) : "Chọn ngày"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={selectedDate ?? undefined} onSelect={handlePickDay} />
        </PopoverContent>
      </Popover>

      <div className="relative">
        <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="time"
          step={60}
          value={timeValue}
          onChange={(e) => handlePickTime(e.target.value)}
          disabled={disabled}
          className="pl-9"
          aria-label={selectedDate ? `Giờ: ${formatDateTime(selectedDate)}` : "Giờ bắt đầu"}
        />
      </div>
    </div>
  );
}

