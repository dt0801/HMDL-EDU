"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  FileText,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  Type,
  Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateLesson,
  useDeleteLesson,
  useLessons,
  useReorderLessons,
  useUpdateLesson,
} from "@/hooks/useLessons";
import { formatDuration } from "@/lib/utils";
import type { LessonInput } from "@/lib/validations/lesson.schema";
import type { Lesson, LessonType } from "@/types/database.types";

import { LessonDialog } from "./lesson-dialog";

const ICON_BY_TYPE: Record<LessonType, typeof Video> = {
  video: Video,
  document: FileText,
  text: Type,
};

function SortableRow({
  lesson,
  onEdit,
  onDelete,
}: {
  lesson: Lesson;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lesson.id,
  });
  const Icon = ICON_BY_TYPE[lesson.type];

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-3 rounded-md border bg-card p-3"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground"
        aria-label="Kéo để sắp xếp"
      >
        <GripVertical className="h-4 w-4" />
      </Button>
      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{lesson.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{lesson.type}</span>
          {lesson.duration_seconds ? <span>· {formatDuration(lesson.duration_seconds)}</span> : null}
          {!lesson.is_published ? <Badge variant="warning">Nháp</Badge> : null}
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Sửa">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Xóa">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export function LessonsTab({ courseId }: { courseId: string }) {
  const { data, isLoading } = useLessons(courseId);
  const createLesson = useCreateLesson();
  const updateLesson = useUpdateLesson();
  const deleteLesson = useDeleteLesson();
  const reorder = useReorderLessons();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [optimisticOrder, setOptimisticOrder] = useState<Lesson[] | null>(null);
  const order = optimisticOrder ?? data ?? [];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = order.findIndex((l) => l.id === active.id);
    const newIdx = order.findIndex((l) => l.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(order, oldIdx, newIdx);
    setOptimisticOrder(next);
    reorder.mutate(
      { courseId, orderedIds: next.map((l) => l.id) },
      {
        onSuccess: () => setOptimisticOrder(null),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Lỗi sắp xếp"),
      }
    );
  };

  const handleSubmit = (input: LessonInput) => {
    if (editing) {
      updateLesson.mutate(
        { id: editing.id, course_id: courseId, ...input },
        {
          onSuccess: () => {
            toast.success("Đã cập nhật bài học");
            setDialogOpen(false);
            setEditing(null);
          },
          onError: (e) => toast.error(e instanceof Error ? e.message : "Lỗi"),
        }
      );
    } else {
      createLesson.mutate(
        {
          ...input,
          course_id: courseId,
          sort_order: (order.at(-1)?.sort_order ?? 0) + 1,
        },
        {
          onSuccess: () => {
            toast.success("Đã thêm bài học");
            setOptimisticOrder(null);
            setDialogOpen(false);
          },
          onError: (e) => toast.error(e instanceof Error ? e.message : "Lỗi"),
        }
      );
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Kéo thả để thay đổi thứ tự bài học.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Thêm bài học
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : order.length === 0 ? (
          <EmptyState
            icon={Video}
            title="Chưa có bài học"
            description="Thêm bài học đầu tiên cho khóa của bạn."
          />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={order.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {order.map((l) => (
                  <SortableRow
                    key={l.id}
                    lesson={l}
                    onEdit={() => {
                      setEditing(l);
                      setDialogOpen(true);
                    }}
                    onDelete={() => {
                      if (!confirm(`Xóa bài "${l.title}"?`)) return;
                      deleteLesson.mutate(
                        { id: l.id, course_id: courseId },
                        {
                          onSuccess: () => toast.success("Đã xóa"),
                          onError: (e) => toast.error(e instanceof Error ? e.message : "Lỗi"),
                        }
                      );
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      <LessonDialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setEditing(null);
        }}
        lesson={editing}
        courseId={courseId}
        onSubmit={handleSubmit}
        isSubmitting={createLesson.isPending || updateLesson.isPending}
      />
    </Card>
  );
}
