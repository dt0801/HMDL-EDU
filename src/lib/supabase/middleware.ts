import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database.types";
import type { UserRole } from "@/types/database.types";

const PUBLIC_PATHS = ["/login", "/auth"];

const ROLE_HOME: Record<UserRole, string> = {
  admin: "/admin/users",
  instructor: "/instructor/courses",
  student: "/student/dashboard",
};

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function deniedFor(role: UserRole | null, pathname: string): boolean {
  if (!role) return true;
  if (pathname.startsWith("/admin")) return role !== "admin";
  if (pathname.startsWith("/instructor")) return role !== "admin" && role !== "instructor";
  if (pathname.startsWith("/student")) return false; // tất cả role đã đăng nhập đều xem được trang student (admin/instructor xem preview)
  return false;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user) {
    if (isPublicPath(pathname) || pathname === "/") {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Đã đăng nhập - lấy role để guard route theo phân quyền
  let { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  // Nếu user đã tồn tại nhưng chưa có profile (ví dụ migrations/triggers apply sau),
  // thử auto-provision bằng service role để tránh redirect loop.
  if (!profile && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const service = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {},
        },
      }
    );

    await service.from("profiles").upsert(
      {
        id: user.id,
        full_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
        email: user.email ?? "",
        role: (user.user_metadata?.role as UserRole | undefined) ?? "student",
        department: user.user_metadata?.department ?? null,
        is_active: true,
      },
      { onConflict: "id" }
    );

    const refetch = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();
    profile = refetch.data ?? null;
  }

  const role: UserRole | null = profile?.role ?? null;

  if (profile && profile.is_active === false) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "account_disabled");
    return NextResponse.redirect(url);
  }

  // Đã đăng nhập mà vào / hoặc /login → redirect về home theo role
  if (pathname === "/" || pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = role ? ROLE_HOME[role] : "/student/dashboard";
    return NextResponse.redirect(url);
  }

  if (deniedFor(role, pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = role ? ROLE_HOME[role] : "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
