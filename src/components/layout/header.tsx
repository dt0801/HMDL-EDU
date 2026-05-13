"use client";

import { Bell, LogOut, User } from "lucide-react";
import { usePathname } from "next/navigation";

import { signOutAction } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials, roleLabel } from "@/lib/utils";
import type { Profile, UserRole } from "@/types/database.types";

import { MobileNav } from "./mobile-nav";

export function Header({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const viewingAs: UserRole | null = pathname.startsWith("/admin")
    ? "admin"
    : pathname.startsWith("/instructor")
      ? "instructor"
      : pathname.startsWith("/student")
        ? "student"
        : null;
  const isPreviewMode = viewingAs != null && viewingAs !== profile.role;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:px-6">
      <MobileNav role={profile.role} />

      <div className="flex-1">
        {isPreviewMode ? (
          <Badge variant="secondary" className="hidden sm:inline-flex">
            Đang xem như {roleLabel(viewingAs)}
          </Badge>
        ) : null}
      </div>

      <Button variant="ghost" size="icon" aria-label="Thông báo">
        <Bell className="h-5 w-5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-auto justify-start gap-2 rounded-full p-1 transition-colors hover:bg-accent"
            aria-label="Tài khoản"
          >
            <Avatar className="h-8 w-8">
              {profile.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
              <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight">{profile.full_name}</p>
              <Badge variant="outline" className="mt-0.5 text-[10px]">
                {roleLabel(profile.role)}
              </Badge>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <p className="font-medium">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <User className="mr-2 h-4 w-4" />
            Hồ sơ cá nhân
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={async (e) => {
              e.preventDefault();
              await signOutAction();
            }}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
