"use client";

import { Loader2, Plus, RotateCcw, Save, Square, Trash2, Type } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CERTIFICATE_PLACEHOLDERS } from "@/lib/certificate/placeholders";
import type { Json } from "@/types/database.types";

const WIDTH = 1320;
const HEIGHT = 934;
const ALL_COURSES = "__all__";

type CourseOption = {
  id: string;
  title: string;
};

type EditableCanvas = {
  add: (object: unknown) => void;
  remove: (object: unknown) => void;
  setActiveObject: (object: unknown) => void;
  getActiveObject: () => unknown | null;
  getObjects: () => unknown[];
  clear: () => void;
  renderAll: () => void;
  toJSON: (propertiesToInclude?: string[]) => Json;
  dispose: () => void;
};

type FabricModule = typeof import("fabric")["fabric"];

function buildCertificateCodePreview() {
  return `CERT-${new Date().getFullYear()}-PREVIEW`;
}

function setCanvasDefaults(fabric: FabricModule, canvas: EditableCanvas) {
  canvas.clear();

  const border = new fabric.Rect({
    left: 44,
    top: 44,
    width: WIDTH - 88,
    height: HEIGHT - 88,
    fill: "#ffffff",
    stroke: "#0284c7",
    strokeWidth: 8,
    selectable: false,
  });

  const brand = new fabric.Textbox("HMDL-EDU", {
    left: 0,
    top: 120,
    width: WIDTH,
    textAlign: "center",
    fontSize: 28,
    fill: "#0284c7",
    charSpacing: 240,
    fontFamily: "Arial",
    fontWeight: "bold",
  });

  const title = new fabric.Textbox("CHỨNG CHỈ HOÀN THÀNH", {
    left: 0,
    top: 185,
    width: WIDTH,
    textAlign: "center",
    fontSize: 58,
    fill: "#0f172a",
    fontFamily: "Arial",
    fontWeight: "bold",
  });

  const intro = new fabric.Textbox("Chứng nhận", {
    left: 0,
    top: 330,
    width: WIDTH,
    textAlign: "center",
    fontSize: 28,
    fill: "#64748b",
    fontFamily: "Arial",
  });

  const student = new fabric.Textbox("{{TEN_HOC_VIEN}}", {
    left: 210,
    top: 390,
    width: WIDTH - 420,
    textAlign: "center",
    fontSize: 66,
    fill: "#0f172a",
    fontFamily: "Arial",
    fontWeight: "bold",
  });

  const course = new fabric.Textbox("đã hoàn thành khóa học {{TEN_KHOA_HOC}}", {
    left: 190,
    top: 505,
    width: WIDTH - 380,
    textAlign: "center",
    fontSize: 34,
    fill: "#0284c7",
    fontFamily: "Arial",
    fontWeight: "bold",
  });

  const footer = new fabric.Textbox("Số: {{MA_CHUNG_CHI}}    |    Ngày cấp: {{NGAY_CAP}}", {
    left: 170,
    top: 745,
    width: WIDTH - 340,
    textAlign: "center",
    fontSize: 24,
    fill: "#475569",
    fontFamily: "Arial",
  });

  canvas.add(border);
  canvas.add(brand);
  canvas.add(title);
  canvas.add(intro);
  canvas.add(student);
  canvas.add(course);
  canvas.add(footer);
  canvas.renderAll();
}

export function CertificateTemplateDesigner({
  courses,
  isSaving,
  onSave,
}: {
  courses: CourseOption[];
  isSaving?: boolean;
  onSave: (input: {
    name: string;
    courseId: string | null;
    canvasJSON: Json;
    width: number;
    height: number;
  }) => Promise<void>;
}) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = useRef<EditableCanvas | null>(null);
  const fabricRef = useRef<FabricModule | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("Mẫu chứng chỉ HMDL");
  const [courseId, setCourseId] = useState(ALL_COURSES);
  const [placeholder, setPlaceholder] = useState<string>(CERTIFICATE_PLACEHOLDERS[0].key);

  const courseLabel = useMemo(() => {
    if (courseId === ALL_COURSES) return "dùng chung";
    return courses.find((course) => course.id === courseId)?.title ?? "khóa học";
  }, [courseId, courses]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { fabric } = await import("fabric");
      if (!mounted || !canvasElementRef.current) return;

      const canvas = new fabric.Canvas(canvasElementRef.current, {
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: "#ffffff",
        preserveObjectStacking: true,
      }) as unknown as EditableCanvas;

      fabricRef.current = fabric;
      canvasRef.current = canvas;
      setCanvasDefaults(fabric, canvas);
      setReady(true);
    }

    init().catch((error) => {
      toast.error(error instanceof Error ? error.message : "Không tải được trình thiết kế.");
    });

    return () => {
      mounted = false;
      canvasRef.current?.dispose();
      canvasRef.current = null;
    };
  }, []);

  const addText = (text: string) => {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;

    const object = new fabric.Textbox(text, {
      left: 180,
      top: 180,
      width: 520,
      fontSize: 34,
      fill: "#0f172a",
      fontFamily: "Arial",
    });
    canvas.add(object);
    canvas.setActiveObject(object);
    canvas.renderAll();
  };

  const addRect = () => {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;

    const object = new fabric.Rect({
      left: 160,
      top: 160,
      width: 280,
      height: 120,
      fill: "rgba(2,132,199,0.08)",
      stroke: "#0284c7",
      strokeWidth: 3,
    });
    canvas.add(object);
    canvas.setActiveObject(object);
    canvas.renderAll();
  };

  const removeSelected = () => {
    const canvas = canvasRef.current;
    const selected = canvas?.getActiveObject();
    if (!canvas || !selected) return;
    canvas.remove(selected);
    canvas.renderAll();
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Vui lòng nhập tên mẫu.");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error("Trình thiết kế chưa sẵn sàng.");
      return;
    }

    await onSave({
      name: trimmedName,
      courseId: courseId === ALL_COURSES ? null : courseId,
      canvasJSON: canvas.toJSON(["selectable"]),
      width: WIDTH,
      height: HEIGHT,
    });
  };

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="min-w-0 self-start overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <CardTitle className="text-base">Cấu hình template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          <div className="space-y-2">
            <Label>Tên mẫu</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Khóa học áp dụng</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_COURSES}>Dùng chung cho mọi khóa</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Mẫu hiện tại {courseLabel}.</p>
          </div>

          <div className="space-y-2">
            <Label>Placeholder</Label>
            <Select value={placeholder} onValueChange={setPlaceholder}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CERTIFICATE_PLACEHOLDERS.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" className="w-full" onClick={() => addText(placeholder)}>
              <Plus className="mr-2 h-4 w-4" />
              Chèn biến
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => addText("Nội dung mới")}>
              <Type className="mr-2 h-4 w-4" />
              Text
            </Button>
            <Button type="button" variant="outline" onClick={addRect}>
              <Square className="mr-2 h-4 w-4" />
              Khối
            </Button>
            <Button type="button" variant="outline" onClick={() => {
              const fabric = fabricRef.current;
              const canvas = canvasRef.current;
              if (fabric && canvas) setCanvasDefaults(fabric, canvas);
            }}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button type="button" variant="outline" onClick={removeSelected}>
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa
            </Button>
          </div>

          <Button type="button" className="w-full" onClick={handleSave} disabled={!ready || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Lưu template
          </Button>

          <div className="rounded-md border bg-sky-50 p-3 text-xs text-sky-800">
            Mã preview: {buildCertificateCodePreview()}. Bấm đúp vào chữ trên canvas để sửa trực tiếp.
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Preview chứng chỉ</CardTitle>
            <div className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {WIDTH} x {HEIGHT}px
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="min-w-0 overflow-auto bg-slate-100 p-5">
            <div className="certificate-canvas-stage mx-auto aspect-[1320/934] w-full max-w-[1080px] rounded-lg bg-white p-2 shadow-sm ring-1 ring-border [&_.canvas-container]:!h-full [&_.canvas-container]:!w-full [&_canvas]:!h-full [&_canvas]:!w-full">
              <canvas ref={canvasElementRef} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

