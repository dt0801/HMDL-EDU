import { BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Course } from "@/types/database.types";

export type CourseCardProps = {
  course: Pick<
    Course,
    "id" | "title" | "description" | "thumbnail_url" | "category" | "is_published"
  >;
  href: string;
  footer?: React.ReactNode;
};

export function CourseCard({ course, href, footer }: CourseCardProps) {
  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <Link href={href} className="block">
        <div className="relative aspect-video bg-muted">
          {course.thumbnail_url ? (
            <Image
              src={course.thumbnail_url}
              alt={course.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 to-sky-100">
              <BookOpen className="h-10 w-10 text-primary/60" />
            </div>
          )}
          <div className="absolute left-2 top-2 flex gap-1">
            {course.category ? <Badge variant="secondary">{course.category}</Badge> : null}
            {!course.is_published ? <Badge variant="warning">Bản nháp</Badge> : null}
          </div>
        </div>
      </Link>
      <CardContent className="p-4">
        <Link href={href}>
          <h3 className="line-clamp-2 font-semibold transition-colors group-hover:text-primary">
            {course.title}
          </h3>
        </Link>
        {course.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
        ) : null}
        {footer ? <div className="mt-3">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
