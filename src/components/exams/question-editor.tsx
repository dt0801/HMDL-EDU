"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { questionSchema, type QuestionInput } from "@/lib/validations/exam.schema";
import type { QuestionType } from "@/types/database.types";

import type { QuestionWithAnswers } from "@/hooks/useExams";

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "Một đáp án đúng",
  multi: "Nhiều đap an đúng",
  true_false: "Đúng / Sai",
};

export function QuestionEditor({
  open,
  onOpenChange,
  question,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  question: QuestionWithAnswers | null;
  onSubmit: (input: QuestionInput) => void;
  isSubmitting?: boolean;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<QuestionInput>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      content: "",
      type: "mcq",
      points: 1,
      explanation: "",
      answers: [
        { content: "", is_correct: true },
        { content: "", is_correct: false },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "answers" });
  const type = useWatch({ control, name: "type" });
  const answers = useWatch({ control, name: "answers" });

  useEffect(() => {
    if (!open) return;
    if (question) {
      reset({
        id: question.id,
        content: question.content,
        type: question.type,
        points: question.points,
        explanation: question.explanation ?? "",
        answers: question.answers.map((a) => ({
          id: a.id,
          content: a.content,
          is_correct: a.is_correct,
        })),
      });
    } else {
      reset({
        content: "",
        type: "mcq",
        points: 1,
        explanation: "",
        answers: [
          { content: "", is_correct: true },
          { content: "", is_correct: false },
        ],
      });
    }
  }, [open, question, reset]);

  useEffect(() => {
    if (type === "true_false") {
      setValue("answers", [
        { content: "Đúng", is_correct: answers?.[0]?.is_correct ?? true },
        { content: "Sai", is_correct: answers?.[1]?.is_correct ?? false },
      ]);
    }
    // Cố tình không depend trên `answers` để tránh loop khi gõ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, setValue]);

  const handleSetCorrect = (idx: number, checked: boolean) => {
    if (type === "mcq" || type === "true_false") {
      // single-select: clear others
      fields.forEach((_, i) => setValue(`answers.${i}.is_correct`, i === idx ? checked : false));
    } else {
      setValue(`answers.${idx}.is_correct`, checked);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{question ? "Sửa câu hỏi" : "Thêm câu hỏi mới"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="content">Nội dung câu hỏi *</Label>
            <Textarea id="content" rows={3} {...register("content")} />
            {errors.content ? (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Loại câu hỏi</Label>
              <Select
                value={type}
                onValueChange={(v) => setValue("type", v as QuestionType, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">Điểm</Label>
              <Input id="points" type="number" {...register("points", { valueAsNumber: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Đáp án</Label>
            {errors.answers?.message ? (
              <p className="text-sm text-destructive">{errors.answers.message}</p>
            ) : null}
            {type === "multi" ? (
              <div className="space-y-2">
                {fields.map((f, idx) => (
                  <div key={f.id} className="flex items-start gap-2">
                    <Checkbox
                      checked={!!answers?.[idx]?.is_correct}
                      onCheckedChange={(checked) => handleSetCorrect(idx, checked === true)}
                      className="mt-3"
                      aria-label="Đánh dấu đáp án đúng"
                    />
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder={`Đáp án ${idx + 1}`}
                        {...register(`answers.${idx}.content`)}
                      />
                      {errors.answers?.[idx]?.content ? (
                        <p className="text-xs text-destructive">
                          {errors.answers[idx]?.content?.message}
                        </p>
                      ) : null}
                    </div>
                    {fields.length > 2 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(idx)}
                        aria-label="Xóa đáp án"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <RadioGroup
                value={String(Math.max(0, answers?.findIndex((a) => a?.is_correct) ?? 0))}
                onValueChange={(v) => handleSetCorrect(Number(v), true)}
                className="space-y-2"
              >
                {fields.map((f, idx) => (
                  <div key={f.id} className="flex items-start gap-2">
                    <RadioGroupItem value={String(idx)} className="mt-3" aria-label="Đánh dấu đáp án đúng" />
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder={`Đáp án ${idx + 1}`}
                        {...register(`answers.${idx}.content`)}
                        disabled={type === "true_false"}
                      />
                      {errors.answers?.[idx]?.content ? (
                        <p className="text-xs text-destructive">
                          {errors.answers[idx]?.content?.message}
                        </p>
                      ) : null}
                    </div>
                    {type !== "true_false" && fields.length > 2 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(idx)}
                        aria-label="Xóa đáp án"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </RadioGroup>
            )}
            {type !== "true_false" && fields.length < 8 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ content: "", is_correct: false })}
              >
                <Plus className="mr-1 h-4 w-4" /> Thêm đáp án
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="explanation">Giải thích đáp án (tùy chọn)</Label>
            <Textarea id="explanation" rows={2} {...register("explanation")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
