import { HeartPulse } from "lucide-react";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-gradient-to-br from-primary via-primary/90 to-sky-700 p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <HeartPulse className="h-6 w-6" />
          HMDL-edu
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Nền tảng đào tạo nội bộ dành cho nhân viên y tế
          </h1>
          <p className="text-base text-primary-foreground/80">
            Quản lý khóa học, video bài giảng, đề thi và chứng chỉ đào tạo trong môi trường bệnh
            viện - tất cả tại một nơi.
          </p>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li>• Học tập linh hoạt theo lịch trực</li>
            <li>• Theo dõi tiến độ và cấp chứng chỉ tự động</li>
            <li>• Bảo mật chuẩn bệnh viện - phân quyền chặt chẽ</li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/70">
          © {new Date().getFullYear()} HMDL-edu. Bản nội bộ.
        </p>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">{children}</div>
    </div>
  );
}
