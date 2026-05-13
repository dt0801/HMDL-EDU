"use client";

import { Calendar as CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatDateTime } from "@/lib/utils";

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

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 5), []);

  const selectedHour = selectedDate ? selectedDate.getHours() : 9;
  const selectedMinute = selectedDate ? selectedDate.getMinutes() : 0;

  const updateDate = (next: Date) => {
    onChange(toLocalDateTimeInput(next));
  };

  const handlePickDay = (day: Date | undefined) => {
    if (!day) return;
    const base = selectedDate ?? new Date();
    const next = new Date(day);
    next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    updateDate(next);
  };

  const handlePickTime = (hour: number, minute: number) => {
    const base = selectedDate ?? new Date();
    const next = new Date(base);
    next.setHours(hour, minute, 0, 0);
    updateDate(next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? formatDateTime(selectedDate) : "Chọn thời gian"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="grid gap-3 p-3 sm:grid-cols-[auto_160px]">
          <Calendar
            mode="single"
            selected={selectedDate ?? undefined}
            onSelect={handlePickDay}
          />

          <div className="flex flex-col gap-2 p-1">
            <div className="text-xs font-medium text-muted-foreground">Giờ</div>
            <Select
              value={pad2(selectedHour)}
              onValueChange={(v) => handlePickTime(Number(v), selectedMinute)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {hours.map((h) => (
                  <SelectItem key={h} value={pad2(h)}>
                    {pad2(h)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="mt-2 text-xs font-medium text-muted-foreground">Phút</div>
            <Select
              value={pad2(selectedMinute - (selectedMinute % 5))}
              onValueChange={(v) => handlePickTime(selectedHour, Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {minutes.map((m) => (
                  <SelectItem key={m} value={pad2(m)}>
                    {pad2(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
