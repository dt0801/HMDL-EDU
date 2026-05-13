"use client";

import { ChevronLeft, ChevronRight, HeartPulse } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUiStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database.types";

import { NAV_BY_ROLE } from "./nav-config";

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);

  const sections = NAV_BY_ROLE[role];

  return (
    <aside
      className={cn(
        "hidden border-r bg-card transition-[width] duration-200 lg:flex lg:flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        <Link
          href={`/${role === "admin" ? "admin" : role === "instructor" ? "instructor/courses" : "student/dashboard"}`}
          className="flex items-center gap-2 font-semibold text-primary"
        >
          <HeartPulse className="h-6 w-6 shrink-0" />
          {!collapsed && <span>HMDL-edu</span>}
        </Link>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Thu/mở sidebar">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    {item.disabled ? (
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/70",
                          "cursor-not-allowed opacity-70",
                          collapsed && "justify-center px-2"
                        )}
                        title={collapsed ? item.label : undefined}
                        aria-disabled="true"
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed ? (
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <span className="truncate">{item.label}</span>
                            {item.badge ? (
                              <Badge variant="secondary" className="shrink-0">
                                {item.badge}
                              </Badge>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          collapsed && "justify-center px-2"
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!collapsed ? (
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <span className="truncate">{item.label}</span>
                            {item.badge ? (
                              <Badge variant="secondary" className="shrink-0">
                                {item.badge}
                              </Badge>
                            ) : null}
                          </div>
                        ) : null}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {role === "admin" && !collapsed ? (
        <div className="border-t p-3">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Chế độ xem
          </p>
          <div className="grid gap-2">
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link href="/admin/users">Admin</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link href="/instructor/courses">Xem như giảng viên</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start">
              <Link href="/student/dashboard">Xem như học viên</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
