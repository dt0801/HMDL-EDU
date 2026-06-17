"use client";

import { HeartPulse, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUiStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database.types";

import { NAV_BY_ROLE } from "./nav-config";

export function MobileNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  const sections = NAV_BY_ROLE[role];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Mở menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-16 items-center gap-2 border-b px-4 font-semibold text-primary">
          <HeartPulse className="h-6 w-6" />
          HMDL-edu
        </div>
        <nav className="space-y-4 p-3">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      {item.disabled ? (
                        <div
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                            "cursor-not-allowed text-muted-foreground/70 opacity-70"
                          )}
                          aria-disabled="true"
                        >
                          <Icon className="h-4 w-4" />
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <span className="truncate">{item.label}</span>
                            {item.badge ? <Badge variant="secondary">{item.badge}</Badge> : null}
                          </div>
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          prefetch
                          onFocus={() => router.prefetch(item.href)}
                          onTouchStart={() => router.prefetch(item.href)}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <span className="truncate">{item.label}</span>
                            {item.badge ? <Badge variant="secondary">{item.badge}</Badge> : null}
                          </div>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {role === "admin" ? (
          <div className="border-t p-3">
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Chế độ xem
            </p>
            <div className="grid gap-2">
              <Button asChild variant="outline" size="sm" className="justify-start" onClick={() => setOpen(false)}>
                <Link href="/admin/users">Admin</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start" onClick={() => setOpen(false)}>
                <Link href="/instructor/courses">Xem như giảng viên</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start" onClick={() => setOpen(false)}>
                <Link href="/student/dashboard">Xem như học viên</Link>
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
