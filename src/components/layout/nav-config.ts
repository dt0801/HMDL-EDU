import {
  Award,
  BarChart3,
  BookOpen,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Library,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/types/database.types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_BY_ROLE: Record<UserRole, NavSection[]> = {
  admin: [
    {
      title: "Quản trị",
      items: [
        { href: "/admin/users", label: "Người dùng", icon: Users },
        { href: "/admin/courses", label: "Khóa học", icon: Library },
        { href: "/admin/reports", label: "Báo cáo", icon: BarChart3 },
      ],
    },
    {
      title: "Giảng viên",
      items: [
        { href: "/instructor/courses", label: "Khóa học của tôi", icon: BookOpen },
        { href: "/instructor/exams", label: "Đề thi", icon: ClipboardList },
      ],
    },
    {
      title: "Học viên",
      items: [
        { href: "/student/dashboard", label: "Trang chính", icon: LayoutDashboard },
        { href: "/student/courses", label: "Khám phá khóa học", icon: GraduationCap },
        { href: "/student/certificates", label: "Chứng chỉ", icon: Award },
      ],
    },
  ],
  instructor: [
    {
      title: "Giảng viên",
      items: [
        { href: "/instructor/courses", label: "Khóa học của tôi", icon: BookOpen },
        { href: "/instructor/exams", label: "Đề thi", icon: ClipboardList },
      ],
    },
  ],
  student: [
    {
      title: "Học viên",
      items: [
        { href: "/student/dashboard", label: "Trang chính", icon: LayoutDashboard },
        { href: "/student/courses", label: "Khám phá khóa học", icon: GraduationCap },
        { href: "/student/certificates", label: "Chứng chỉ", icon: Award },
      ],
    },
  ],
};
