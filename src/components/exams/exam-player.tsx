"use client";

import { Clock, Flag, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { QuestionWithAnswers } from "@/hooks/useExams";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type AnswerSelection = Record<string, string[]>; // question_id -> answer_ids[]

export function ExamPlayer({
  questions,
  durationMinutes,
  onSubmit,
  isSubmitting,
}: {
  questions: QuestionWithAnswers[];
  durationMinutes: number;
  onSubmit: (selection: AnswerSelection) => void;
  isSubmitting?: boolean;
}) {
  const totalSeconds = durationMinutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [selection, setSelection] = useState<AnswerSelection>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          setSubmitted(true);
          onSubmit(selection);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [submitted, selection, onSubmit]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeColor = remaining < 60 ? "text-destructive" : "text-foreground";

  const current = questions[currentIdx];
  const totalAnswered = useMemo(
    () => Object.keys(selection).filter((k) => (selection[k]?.length ?? 0) > 0).length,
    [selection]
  );

  const toggle = (qId: string, aId: string, multi: boolean) => {
    setSelection((s) => {
      const prev = s[qId] ?? [];
      if (multi) {
        return {
          ...s,
          [qId]: prev.includes(aId) ? prev.filter((x) => x !== aId) : [...prev, aId],
        };
      }
      return { ...s, [qId]: [aId] };
    });
  };

  const handleSubmit = () => {
    if (!confirm("Bạn chắc chắn muốn nộp bài?")) return;
    setSubmitted(true);
    onSubmit(selection);
  };

  if (!current) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="gap-1">
            <Clock className={cn("h-3.5 w-3.5", timeColor)} />
            <span className={cn("font-mono", timeColor)}>
              {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
            </span>
          </Badge>
          <p className="text-sm text-muted-foreground">
            Câu {currentIdx + 1} / {questions.length}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base leading-relaxed">{current.content}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {current.answers.map((a) => {
              const isMulti = current.type === "multi";
              const isSelected = (selection[current.id] ?? []).includes(a.id);
              return (
                <label
                  key={a.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
                    isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <input
                    type={isMulti ? "checkbox" : "radio"}
                    name={current.id}
                    className="mt-0.5 h-4 w-4 accent-primary"
                    checked={isSelected}
                    onChange={() => toggle(current.id, a.id, isMulti)}
                    disabled={submitted}
                  />
                  <span className="text-sm">{a.content}</span>
                </label>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          >
            Câu trước
          </Button>
          {currentIdx < questions.length - 1 ? (
            <Button onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}>
              Câu tiếp
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitted || isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flag className="mr-2 h-4 w-4" />}
              Nộp bài
            </Button>
          )}
        </div>
      </div>

      <Card className="h-fit">
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-medium">
            Đã trả lời: {totalAnswered}/{questions.length}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const answered = (selection[q.id]?.length ?? 0) > 0;
              const isCurrent = idx === currentIdx;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  className={cn(
                    "h-8 rounded text-xs font-medium transition-colors",
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : answered
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
