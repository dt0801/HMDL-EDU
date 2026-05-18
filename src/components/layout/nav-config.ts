import {
  Activity,
  Award,
  BarChart3,
  Bell,
  BookOpenText,
  Building2,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Library,
  Route,
  ScrollText,
  Settings,
  Shield,
  Tags,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/types/database.types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  disabled?: boolean;
  badge?: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_BY_ROLE: Record<UserRole, NavSection[]> = {
  admin: [
    {
      title: "Tổng quan",
      items: [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
        {
          href: "/admin/activity",
          label: "Hoạt động gần đây",
          icon: Activity,
          badge: "Beta",
        },
      ],
    },
    {
      title: "Quản trị đào tạo",
      items: [
        { href: "/admin/courses", label: "Khóa học", icon: Library },
        { href: "/admin/learning-paths", label: "Lộ trình đào tạo", icon: Route, badge: "Beta" },
        { href: "/admin/exams", label: "Đề thi", icon: ClipboardList },
        { href: "/admin/certificates", label: "Chứng chỉ", icon: Award },
        { href: "/admin/categories", label: "Danh mục / Chuyên khoa", icon: Tags, badge: "Beta" },
      ],
    },
    {
      title: "Người dùng & phân quyền",
      items: [
        { href: "/admin/users", label: "Người dùng", icon: Users },
        { href: "/admin/roles", label: "Vai trò & quyền hạn", icon: Shield, badge: "Beta" },
        { href: "/admin/departments", label: "Khoa / Phòng ban", icon: Building2 },
        { href: "/admin/assignments", label: "Phân công giảng viên", icon: UserCog },
      ],
    },
    {
      title: "Vận hành",
      items: [
        {
          href: "/admin/enrollments",
          label: "Ghi danh học viên",
          icon: GraduationCap,
        },
        {
          href: "/admin/content-approvals",
          label: "Phê duyệt nội dung",
          icon: ClipboardCheck,
          badge: "Beta",
        },
        { href: "/admin/notifications", label: "Thông báo", icon: Bell },
        { href: "/admin/reports", label: "Báo cáo", icon: BarChart3 },
      ],
    },
    {
      title: "Hệ thống",
      items: [
        { href: "/admin/settings", label: "Cấu hình", icon: Settings, badge: "Beta" },
        { href: "/admin/audit-log", label: "Nhật ký hoạt động", icon: ScrollText, badge: "Beta" },
      ],
    },
  ],
  instructor: [
    {
      title: "Giảng viên",
      items: [
        { href: "/instructor/courses", label: "Khóa học của tôi", icon: Library },
        { href: "/instructor/live-sessions", label: "Lớp học trực tuyến", icon: CalendarClock },
        { href: "/instructor/documents", label: "Tài liệu", icon: BookOpenText },
        { href: "/instructor/exams", label: "Đề thi", icon: ClipboardList },
        { href: "/instructor/certificates", label: "Chứng chỉ", icon: Award },
      ],
    },
  ],
  student: [
    {
      title: "Học viên",
      items: [
        { href: "/student/dashboard", label: "Trang chính", icon: LayoutDashboard },
        { href: "/student/courses", label: "Khám phá khóa học", icon: GraduationCap },
        { href: "/student/live-sessions", label: "Lớp học trực tuyến", icon: CalendarClock },
        { href: "/student/documents", label: "Tài liệu", icon: BookOpenText },
        { href: "/student/exams", label: "Thi trắc nghiệm", icon: ClipboardList },
        { href: "/student/certificates", label: "Chứng chỉ", icon: Award },
      ],
    },
  ],
};
