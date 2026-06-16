"use client";

import { CalendarClock, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LiveSessionWithDetails } from "@/hooks/useLiveSessions";
import { formatDateTime } from "@/lib/utils";

function getSessionEndMs(session: Pick<LiveSessionWithDetails, "scheduled_start_at" | "duration_minutes">) {
  return new Date(session.scheduled_start_at).getTime() + session.duration_minutes * 60_000;
}

function SessionGrid({
  title,
  sessions,
  showCourse,
}: {
  title: string;
  sessions: LiveSessionWithDetails[];
  showCourse?: boolean;
}) {
  if (sessions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Badge variant="outline">{sessions.length}</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {sessions.map((session) => (
          <Card key={session.id} className="flex h-full flex-col">
            <CardHeader className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="line-clamp-2">{session.title}</CardTitle>
                  <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {showCourse && session.course?.title ? <span>{session.course.title}</span> : null}
                    {session.lesson?.title ? <span>{session.lesson.title}</span> : null}
                  </div>
                </div>
                <Badge variant="secondary">Sẵn sàng</Badge>
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4">
              {session.description ? (
                <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {session.description}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Bắt đầu</p>
                  <p className="mt-1 font-medium">{formatDateTime(session.scheduled_start_at)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Thời lượng</p>
                  <p className="mt-1 font-medium">{session.duration_minutes} phút</p>
                </div>
              </div>

              <div className="mt-auto">
                <Button asChild className="w-full">
                  <a href={session.zoom_join_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Vào lớp Zoom
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function StudentLiveSessionsList({
  sessions,
  showCourse,
  emptyTitle,
  emptyDescription,
}: {
  sessions: LiveSessionWithDetails[];
  showCourse?: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const activeSessions = useMemo(
    () =>
      sessions
        .filter((session) => getSessionEndMs(session) > nowMs)
        .sort((a, b) => new Date(a.scheduled_start_at).getTime() - new Date(b.scheduled_start_at).getTime()),
    [nowMs, sessions]
  );

  if (activeSessions.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title={emptyTitle}
        description={emptyDescription}
        action={
          <Button asChild>
            <Link href="/student/courses">Xem khóa học của tôi</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <SessionGrid title="Sắp diễn ra" sessions={activeSessions} showCourse={showCourse} />
    </div>
  );
}
