import {
  Activity,
  Award,
  BarChart3,
  ClipboardList,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Library,
  Route,
  Settings,
  Shield,
  Tags,
  ScrollText,
  Bell,
  Building2,
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
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard, disabled: true, badge: "Sắp có" },
        {
          href: "/admin/activity",
          label: "Hoạt động gần đây",
          icon: Activity,
          disabled: true,
          badge: "Sắp có",
        },
      ],
    },
    {
      title: "Quản trị đào tạo",
      items: [
        { href: "/admin/courses", label: "Khóa học", icon: Library },
        { href: "/admin/learning-paths", label: "Lộ trình đào tạo", icon: Route, disabled: true, badge: "Sắp có" },
        { href: "/admin/exams", label: "Đề thi", icon: ClipboardList, disabled: true, badge: "Sắp có" },
        { href: "/admin/certificates", label: "Chứng chỉ", icon: Award, disabled: true, badge: "Sắp có" },
        { href: "/admin/categories", label: "Danh mục / Chuyên khoa", icon: Tags, disabled: true, badge: "Sắp có" },
      ],
    },
    {
      title: "Người dùng & phân quyền",
      items: [
        { href: "/admin/users", label: "Người dùng", icon: Users },
        { href: "/admin/roles", label: "Vai trò & quyền hạn", icon: Shield, disabled: true, badge: "Sắp có" },
        { href: "/admin/departments", label: "Khoa / Phòng ban", icon: Building2, disabled: true, badge: "Sắp có" },
        { href: "/admin/assignments", label: "Phân công giảng viên", icon: UserCog, disabled: true, badge: "Sắp có" },
      ],
    },
    {
      title: "Vận hành",
      items: [
        {
          href: "/admin/enrollments",
          label: "Ghi danh học viên",
          icon: GraduationCap,
          disabled: true,
          badge: "Sắp có",
        },
        {
          href: "/admin/content-approvals",
          label: "Phê duyệt nội dung",
          icon: ClipboardCheck,
          disabled: true,
          badge: "Sắp có",
        },
        { href: "/admin/notifications", label: "Thông báo", icon: Bell, disabled: true, badge: "Sắp có" },
        { href: "/admin/reports", label: "Báo cáo", icon: BarChart3 },
      ],
    },
    {
      title: "Hệ thống",
      items: [
        { href: "/admin/settings", label: "Cấu hình", icon: Settings, disabled: true, badge: "Sắp có" },
        { href: "/admin/audit-log", label: "Nhật ký hoạt động", icon: ScrollText, disabled: true, badge: "Sắp có" },
      ],
    },
  ],
  instructor: [
    {
      title: "Giảng viên",
      items: [
        { href: "/instructor/courses", label: "Khóa học của tôi", icon: Library },
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
