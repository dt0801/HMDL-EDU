"use client";

import { Image as ImageIcon, Loader2, Palette, Plus, Save, Square, Trash2, Type } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
const CERT_FONT = "Noto Sans";

const TEMPLATE_PRESETS = [
  { id: "award-ribbon", label: "Khen thưởng ribbon", swatch: "bg-orange-500" },
  { id: "medical-blue", label: "Y tế xanh", swatch: "bg-sky-500" },
  { id: "executive-gold", label: "Danh dự vàng", swatch: "bg-amber-500" },
  { id: "modern-navy", label: "Hiện đại navy", swatch: "bg-slate-900" },
  { id: "clinical-green", label: "Lâm sàng xanh", swatch: "bg-emerald-600" },
  { id: "premium-slate", label: "Tối giản cao cấp", swatch: "bg-zinc-700" },
  { id: "classic-red", label: "Cổ điển đỏ", swatch: "bg-rose-700" },
] as const;

type TemplatePresetId = (typeof TEMPLATE_PRESETS)[number]["id"];

type CourseOption = {
  id: string;
  title: string;
};

type EditableCanvas = {
  add: (object: unknown) => void;
  remove: (object: unknown) => void;
  sendToBack: (object: unknown) => void;
  setActiveObject: (object: unknown) => void;
  getActiveObject: () => unknown | null;
  getObjects: () => unknown[];
  clear: () => void;
  renderAll: () => void;
  toJSON: (propertiesToInclude?: string[]) => Json;
  dispose: () => void;
};

type FabricModule = typeof import("fabric");

type FabricObjectLike = {
  name?: string;
  set: (properties: Record<string, unknown>) => void;
};

function buildCertificateCodePreview() {
  return `CERT-${new Date().getFullYear()}-PREVIEW`;
}

async function waitForCertificateFonts() {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  await Promise.all([
    document.fonts.load(`400 24px "${CERT_FONT}"`),
    document.fonts.load(`600 34px "${CERT_FONT}"`),
    document.fonts.load(`700 58px "${CERT_FONT}"`),
  ]);
  await document.fonts.ready;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Không đọc được ảnh nền."));
    reader.readAsDataURL(file);
  });
}

async function prepareBackgroundImage(file: File) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = new window.Image();
  image.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Ảnh nền không hợp lệ."));
  });

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không thể xử lý ảnh nền.");

  const scale = Math.max(WIDTH / image.width, HEIGHT / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const left = (WIDTH - drawWidth) / 2;
  const top = (HEIGHT - drawHeight) / 2;

  context.drawImage(image, left, top, drawWidth, drawHeight);
  return canvas.toDataURL("image/jpeg", 0.9);
}

function addTextBox(
  fabric: FabricModule,
  canvas: EditableCanvas,
  text: string,
  options: ConstructorParameters<FabricModule["Textbox"]>[1]
) {
  const object = new fabric.Textbox(text, {
    fontFamily: CERT_FONT,
    ...options,
  });
  canvas.add(object);
  return object;
}

function addRect(
  fabric: FabricModule,
  canvas: EditableCanvas,
  options: ConstructorParameters<FabricModule["Rect"]>[0]
) {
  const object = new fabric.Rect(options);
  canvas.add(object);
  return object;
}

function addCircle(
  fabric: FabricModule,
  canvas: EditableCanvas,
  options: ConstructorParameters<FabricModule["Circle"]>[0]
) {
  const object = new fabric.Circle(options);
  canvas.add(object);
  return object;
}

function addPolygon(
  fabric: FabricModule,
  canvas: EditableCanvas,
  points: Array<{ x: number; y: number }>,
  options: ConstructorParameters<FabricModule["Polygon"]>[1]
) {
  const object = new fabric.Polygon(points, options);
  canvas.add(object);
  return object;
}

function addPath(
  fabric: FabricModule,
  canvas: EditableCanvas,
  path: string,
  options: ConstructorParameters<FabricModule["Path"]>[1]
) {
  const object = new fabric.Path(path, options);
  canvas.add(object);
  return object;
}

function addStarburst(
  fabric: FabricModule,
  canvas: EditableCanvas,
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  spikes: number,
  fill: string,
  stroke?: string
) {
  const points = Array.from({ length: spikes * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / spikes;
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });

  return addPolygon(fabric, canvas, points, {
    fill,
    stroke,
    strokeWidth: stroke ? 2 : 0,
    selectable: false,
    evented: false,
  });
}

function addOrnateBorder(fabric: FabricModule, canvas: EditableCanvas) {
  const stroke = "#94a3b8";

  addRect(fabric, canvas, {
    left: 42,
    top: 42,
    width: WIDTH - 84,
    height: HEIGHT - 84,
    fill: "rgba(255,255,255,0)",
    stroke,
    strokeWidth: 3,
    selectable: false,
    evented: false,
  });
  addRect(fabric, canvas, {
    left: 66,
    top: 66,
    width: WIDTH - 132,
    height: HEIGHT - 132,
    fill: "rgba(255,255,255,0)",
    stroke: "#cbd5e1",
    strokeWidth: 1.5,
    selectable: false,
    evented: false,
  });

  for (let x = 82; x <= WIDTH - 82; x += 44) {
    addCircle(fabric, canvas, {
      left: x - 16,
      top: 28,
      radius: 16,
      fill: "rgba(255,255,255,0)",
      stroke,
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    addCircle(fabric, canvas, {
      left: x - 16,
      top: HEIGHT - 60,
      radius: 16,
      fill: "rgba(255,255,255,0)",
      stroke,
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
  }

  for (let y = 82; y <= HEIGHT - 82; y += 44) {
    addCircle(fabric, canvas, {
      left: 28,
      top: y - 16,
      radius: 16,
      fill: "rgba(255,255,255,0)",
      stroke,
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    addCircle(fabric, canvas, {
      left: WIDTH - 60,
      top: y - 16,
      radius: 16,
      fill: "rgba(255,255,255,0)",
      stroke,
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
  }
}

function addRibbonSeal(fabric: FabricModule, canvas: EditableCanvas) {
  addPolygon(
    fabric,
    canvas,
    [
      { x: 132, y: 242 },
      { x: 198, y: 242 },
      { x: 186, y: 570 },
      { x: 158, y: 520 },
      { x: 128, y: 570 },
    ],
    {
      fill: "#fb923c",
      stroke: "#ea580c",
      strokeWidth: 2,
      selectable: false,
      evented: false,
    }
  );
  addPolygon(
    fabric,
    canvas,
    [
      { x: 210, y: 242 },
      { x: 268, y: 242 },
      { x: 336, y: 560 },
      { x: 282, y: 526 },
      { x: 254, y: 590 },
    ],
    {
      fill: "#f97316",
      stroke: "#ea580c",
      strokeWidth: 2,
      selectable: false,
      evented: false,
    }
  );
  addPolygon(
    fabric,
    canvas,
    [
      { x: 176, y: 235 },
      { x: 224, y: 235 },
      { x: 246, y: 560 },
      { x: 208, y: 520 },
      { x: 184, y: 590 },
    ],
    {
      fill: "#fbbf24",
      stroke: "#f59e0b",
      strokeWidth: 2,
      selectable: false,
      evented: false,
    }
  );

  addStarburst(fabric, canvas, 205, 300, 66, 90, 24, "#f97316", "#ea580c");
  addCircle(fabric, canvas, {
    left: 132,
    top: 227,
    radius: 73,
    fill: "#7f1d1d",
    stroke: "#fed7aa",
    strokeWidth: 7,
    selectable: false,
    evented: false,
  });
  addCircle(fabric, canvas, {
    left: 150,
    top: 245,
    radius: 55,
    fill: "#991b1b",
    stroke: "#fbbf24",
    strokeWidth: 3,
    selectable: false,
    evented: false,
  });
  addTextBox(fabric, canvas, "BEST", {
    left: 154,
    top: 262,
    width: 102,
    textAlign: "center",
    fontSize: 23,
    fill: "#fde68a",
    fontWeight: "700",
    charSpacing: 80,
  });
  addTextBox(fabric, canvas, "AWARD", {
    left: 148,
    top: 300,
    width: 114,
    textAlign: "center",
    fontSize: 25,
    fill: "#ffffff",
    fontWeight: "700",
    charSpacing: 80,
  });
  addTextBox(fabric, canvas, "★ ★ ★", {
    left: 152,
    top: 342,
    width: 110,
    textAlign: "center",
    fontSize: 18,
    fill: "#fbbf24",
    fontWeight: "700",
  });
}

function addCertificateCopy(
  fabric: FabricModule,
  canvas: EditableCanvas,
  options: {
    align?: "center" | "left";
    accent: string;
    body: string;
    footer: string;
    headerTop?: number;
    titleTop?: number;
    nameTop?: number;
    titleColor?: string;
    muted?: string;
    compact?: boolean;
  }
) {
  const align = options.align ?? "center";
  const left = align === "center" ? 0 : 255;
  const width = align === "center" ? WIDTH : 820;
  const titleTop = options.titleTop ?? 176;
  const nameTop = options.nameTop ?? 410;
  const textAlign = align;

  addTextBox(fabric, canvas, "HMDL-EDU", {
    left,
    top: options.headerTop ?? 110,
    width,
    textAlign,
    fontSize: align === "center" ? 25 : 24,
    fill: options.accent,
    charSpacing: 180,
    fontWeight: "700",
  });
  addTextBox(fabric, canvas, "CHỨNG CHỈ HOÀN THÀNH", {
    left,
    top: titleTop,
    width,
    textAlign,
    fontSize: options.compact ? 46 : 56,
    fill: options.titleColor ?? "#0f172a",
    fontWeight: "700",
    lineHeight: 1.08,
  });
  addTextBox(fabric, canvas, options.body, {
    left,
    top: titleTop + (options.compact ? 78 : 92),
    width,
    textAlign,
    fontSize: 22,
    fill: options.muted ?? "#64748b",
  });
  addTextBox(fabric, canvas, "Chứng nhận", {
    left,
    top: nameTop - 58,
    width,
    textAlign,
    fontSize: 24,
    fill: options.muted ?? "#64748b",
  });
  addTextBox(fabric, canvas, "{{TEN_HOC_VIEN}}", {
    left,
    top: nameTop,
    width,
    textAlign,
    fontSize: options.compact ? 54 : 64,
    fill: options.titleColor ?? "#0f172a",
    fontWeight: "700",
  });
  addTextBox(fabric, canvas, "đã hoàn thành khóa học {{TEN_KHOA_HOC}}", {
    left,
    top: nameTop + 108,
    width,
    textAlign,
    fontSize: options.compact ? 28 : 32,
    fill: options.accent,
    fontWeight: "600",
  });
  addTextBox(fabric, canvas, options.footer, {
    left,
    top: 730,
    width,
    textAlign,
    fontSize: 21,
    fill: options.muted ?? "#475569",
    lineHeight: 1.45,
  });
}

function setCanvasDefaults(fabric: FabricModule, canvas: EditableCanvas, presetId: TemplatePresetId = "medical-blue") {
  canvas.clear();

  const background = (fill: string) =>
    addRect(fabric, canvas, {
      left: 0,
      top: 0,
      width: WIDTH,
      height: HEIGHT,
      fill,
      selectable: false,
      evented: false,
      name: "background-fill",
    });

  if (presetId === "award-ribbon") {
    background("#ffffff");
    addOrnateBorder(fabric, canvas);
    addPath(
      fabric,
      canvas,
      "M 80 68 L 300 68 C 220 230 230 430 315 866 L 80 866 Z",
      {
        fill: "#0f4c81",
        selectable: false,
        evented: false,
      }
    );
    addPath(
      fabric,
      canvas,
      "M 178 68 L 264 68 C 174 270 182 514 270 866 L 184 866 C 106 530 104 272 178 68 Z",
      {
        fill: "#38bdf8",
        opacity: 0.92,
        selectable: false,
        evented: false,
      }
    );
    addPath(
      fabric,
      canvas,
      "M 134 68 L 188 68 C 112 276 116 518 198 866 L 144 866 C 72 528 72 276 134 68 Z",
      {
        fill: "#fb923c",
        opacity: 0.96,
        selectable: false,
        evented: false,
      }
    );
    addPath(
      fabric,
      canvas,
      "M 286 68 L 345 68 C 248 248 252 520 382 866 L 322 866 C 214 526 208 268 286 68 Z",
      {
        fill: "#f97316",
        opacity: 0.92,
        selectable: false,
        evented: false,
      }
    );
    addPath(
      fabric,
      canvas,
      "M 342 70 C 470 170 565 300 640 462 C 550 395 450 362 330 364 C 300 240 306 142 342 70 Z",
      {
        fill: "#e0f2fe",
        opacity: 0.58,
        selectable: false,
        evented: false,
      }
    );
    addRibbonSeal(fabric, canvas);

    addTextBox(fabric, canvas, "KHEN THƯỞNG", {
      left: 420,
      top: 165,
      width: 790,
      textAlign: "center",
      fontSize: 58,
      fill: "#04736b",
      fontWeight: "700",
      charSpacing: 18,
    });
    addTextBox(fabric, canvas, "Certificate of Achievement", {
      left: 420,
      top: 235,
      width: 790,
      textAlign: "center",
      fontSize: 27,
      fill: "#0f766e",
      fontStyle: "italic",
      fontWeight: "600",
    });
    addRect(fabric, canvas, {
      left: 525,
      top: 292,
      width: 580,
      height: 3,
      fill: "#0f766e",
      selectable: false,
      evented: false,
    });
    addTextBox(fabric, canvas, "Chứng nhận hoàn thành khóa học", {
      left: 420,
      top: 313,
      width: 790,
      textAlign: "center",
      fontSize: 19,
      fill: "#0f766e",
      fontWeight: "700",
      charSpacing: 20,
    });
    addTextBox(fabric, canvas, "{{TEN_HOC_VIEN}}", {
      left: 420,
      top: 368,
      width: 790,
      textAlign: "center",
      fontSize: 58,
      fill: "#0f766e",
      fontWeight: "700",
      fontStyle: "italic",
    });
    addTextBox(fabric, canvas, "đã hoàn thành khóa học {{TEN_KHOA_HOC}}", {
      left: 448,
      top: 482,
      width: 735,
      textAlign: "center",
      fontSize: 27,
      fill: "#0f4c81",
      fontWeight: "600",
      lineHeight: 1.3,
    });
    addTextBox(fabric, canvas, "Số: {{MA_CHUNG_CHI}}", {
      left: 420,
      top: 642,
      width: 350,
      textAlign: "center",
      fontSize: 19,
      fill: "#475569",
    });
    addTextBox(fabric, canvas, "Ngày cấp: {{NGAY_CAP}}", {
      left: 860,
      top: 642,
      width: 350,
      textAlign: "center",
      fontSize: 19,
      fill: "#475569",
    });
    addPath(
      fabric,
      canvas,
      "M 450 710 C 510 680 550 744 612 704 M 458 728 L 620 728",
      {
        fill: "",
        stroke: "#0f766e",
        strokeWidth: 2,
        selectable: false,
        evented: false,
      }
    );
    addPath(
      fabric,
      canvas,
      "M 938 710 C 986 668 1032 746 1090 704 M 928 728 L 1098 728",
      {
        fill: "",
        stroke: "#0f766e",
        strokeWidth: 2,
        selectable: false,
        evented: false,
      }
    );
    addTextBox(fabric, canvas, "GIÁM ĐỐC ĐÀO TẠO", {
      left: 412,
      top: 742,
      width: 250,
      textAlign: "center",
      fontSize: 15,
      fill: "#64748b",
      fontWeight: "700",
    });
    addTextBox(fabric, canvas, "QUẢN LÝ CHƯƠNG TRÌNH", {
      left: 880,
      top: 742,
      width: 300,
      textAlign: "center",
      fontSize: 15,
      fill: "#64748b",
      fontWeight: "700",
    });
    addStarburst(fabric, canvas, 765, 712, 42, 58, 18, "#fbbf24", "#f59e0b");
    addCircle(fabric, canvas, {
      left: 725,
      top: 672,
      radius: 40,
      fill: "#fde68a",
      stroke: "#92400e",
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    addTextBox(fabric, canvas, "BEST\nAWARD", {
      left: 728,
      top: 690,
      width: 74,
      textAlign: "center",
      fontSize: 13,
      fill: "#7c2d12",
      fontWeight: "700",
      lineHeight: 1.05,
    });
  } else if (presetId === "executive-gold") {
    background("#fffaf0");
    addRect(fabric, canvas, {
      left: 56,
      top: 56,
      width: WIDTH - 112,
      height: HEIGHT - 112,
      rx: 10,
      ry: 10,
      fill: "rgba(255,255,255,0.82)",
      stroke: "#b45309",
      strokeWidth: 5,
      selectable: false,
      evented: false,
    });
    addRect(fabric, canvas, {
      left: 85,
      top: 85,
      width: WIDTH - 170,
      height: HEIGHT - 170,
      rx: 6,
      ry: 6,
      fill: "rgba(255,255,255,0)",
      stroke: "#f59e0b",
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    addRect(fabric, canvas, {
      left: 380,
      top: 332,
      width: 560,
      height: 2,
      fill: "#f59e0b",
      selectable: false,
      evented: false,
    });
    addCertificateCopy(fabric, canvas, {
      accent: "#b45309",
      body: "Ghi nhận thành tích đào tạo nội bộ",
      footer: "Số: {{MA_CHUNG_CHI}}        Ngày cấp: {{NGAY_CAP}}",
      titleColor: "#111827",
      muted: "#57534e",
      nameTop: 395,
    });
  } else if (presetId === "modern-navy") {
    background("#f8fafc");
    addRect(fabric, canvas, {
      left: 0,
      top: 0,
      width: 350,
      height: HEIGHT,
      fill: "#0f172a",
      selectable: false,
      evented: false,
    });
    addRect(fabric, canvas, {
      left: 64,
      top: 70,
      width: 222,
      height: HEIGHT - 140,
      fill: "rgba(255,255,255,0)",
      stroke: "#38bdf8",
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    addTextBox(fabric, canvas, "HMDL", {
      left: 72,
      top: 130,
      width: 205,
      textAlign: "center",
      fontSize: 52,
      fill: "#ffffff",
      fontWeight: "700",
      charSpacing: 90,
    });
    addTextBox(fabric, canvas, "EDU", {
      left: 72,
      top: 205,
      width: 205,
      textAlign: "center",
      fontSize: 30,
      fill: "#38bdf8",
      fontWeight: "700",
      charSpacing: 180,
    });
    addTextBox(fabric, canvas, "CERTIFICATE", {
      left: 74,
      top: 650,
      width: 205,
      textAlign: "center",
      fontSize: 17,
      fill: "#cbd5e1",
      charSpacing: 160,
    });
    addRect(fabric, canvas, {
      left: 430,
      top: 96,
      width: 760,
      height: 3,
      fill: "#0ea5e9",
      selectable: false,
      evented: false,
    });
    addCertificateCopy(fabric, canvas, {
      align: "left",
      accent: "#0284c7",
      body: "Đào tạo nội bộ - Bệnh viện HMDL",
      footer: "Số: {{MA_CHUNG_CHI}}\nNgày cấp: {{NGAY_CAP}}",
      titleColor: "#111827",
      nameTop: 420,
      compact: true,
    });
  } else if (presetId === "clinical-green") {
    background("#f7fff9");
    addRect(fabric, canvas, {
      left: 52,
      top: 52,
      width: WIDTH - 104,
      height: HEIGHT - 104,
      rx: 18,
      ry: 18,
      fill: "rgba(255,255,255,0.84)",
      stroke: "#bbf7d0",
      strokeWidth: 3,
      selectable: false,
      evented: false,
    });
    addRect(fabric, canvas, {
      left: 52,
      top: 52,
      width: WIDTH - 104,
      height: 135,
      rx: 18,
      ry: 18,
      fill: "#047857",
      selectable: false,
      evented: false,
    });
    addTextBox(fabric, canvas, "HMDL-EDU", {
      left: 92,
      top: 98,
      width: 360,
      textAlign: "left",
      fontSize: 23,
      fill: "#d1fae5",
      charSpacing: 150,
      fontWeight: "700",
    });
    addTextBox(fabric, canvas, "CHỨNG CHỈ HOÀN THÀNH", {
      left: 0,
      top: 240,
      width: WIDTH,
      textAlign: "center",
      fontSize: 56,
      fill: "#064e3b",
      fontWeight: "700",
    });
    addTextBox(fabric, canvas, "Chứng nhận", {
      left: 0,
      top: 360,
      width: WIDTH,
      textAlign: "center",
      fontSize: 24,
      fill: "#64748b",
    });
    addTextBox(fabric, canvas, "{{TEN_HOC_VIEN}}", {
      left: 190,
      top: 420,
      width: WIDTH - 380,
      textAlign: "center",
      fontSize: 62,
      fill: "#052e16",
      fontWeight: "700",
    });
    addTextBox(fabric, canvas, "đã hoàn thành khóa học {{TEN_KHOA_HOC}}", {
      left: 205,
      top: 536,
      width: WIDTH - 410,
      textAlign: "center",
      fontSize: 31,
      fill: "#047857",
      fontWeight: "600",
    });
    addTextBox(fabric, canvas, "Số: {{MA_CHUNG_CHI}}", {
      left: 150,
      top: 735,
      width: 430,
      textAlign: "left",
      fontSize: 21,
      fill: "#475569",
    });
    addTextBox(fabric, canvas, "Ngày cấp: {{NGAY_CAP}}", {
      left: WIDTH - 580,
      top: 735,
      width: 430,
      textAlign: "right",
      fontSize: 21,
      fill: "#475569",
    });
  } else if (presetId === "premium-slate") {
    background("#fafafa");
    addRect(fabric, canvas, {
      left: 78,
      top: 78,
      width: WIDTH - 156,
      height: HEIGHT - 156,
      fill: "rgba(255,255,255,0.88)",
      stroke: "#d4d4d8",
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    addRect(fabric, canvas, {
      left: 78,
      top: 78,
      width: WIDTH - 156,
      height: 10,
      fill: "#18181b",
      selectable: false,
      evented: false,
    });
    addRect(fabric, canvas, {
      left: 78,
      top: 88,
      width: WIDTH - 156,
      height: 4,
      fill: "#d97706",
      selectable: false,
      evented: false,
    });
    addCertificateCopy(fabric, canvas, {
      accent: "#d97706",
      body: "Đào tạo nội bộ - Bệnh viện HMDL",
      footer: "Số: {{MA_CHUNG_CHI}}        Ngày cấp: {{NGAY_CAP}}",
      titleColor: "#18181b",
      muted: "#52525b",
      headerTop: 130,
      titleTop: 200,
      nameTop: 430,
      compact: true,
    });
  } else if (presetId === "classic-red") {
    background("#fff7ed");
    addRect(fabric, canvas, {
      left: 48,
      top: 48,
      width: WIDTH - 96,
      height: HEIGHT - 96,
      fill: "rgba(255,255,255,0.82)",
      stroke: "#be123c",
      strokeWidth: 5,
      selectable: false,
      evented: false,
    });
    addRect(fabric, canvas, {
      left: 78,
      top: 78,
      width: WIDTH - 156,
      height: HEIGHT - 156,
      fill: "rgba(255,255,255,0)",
      stroke: "#f59e0b",
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    addRect(fabric, canvas, {
      left: 520,
      top: 330,
      width: 280,
      height: 4,
      fill: "#be123c",
      selectable: false,
      evented: false,
    });
    addCertificateCopy(fabric, canvas, {
      accent: "#be123c",
      body: "Ghi nhận kết quả học tập và năng lực chuyên môn",
      footer: "Số: {{MA_CHUNG_CHI}}        Ngày cấp: {{NGAY_CAP}}",
      titleColor: "#111827",
      muted: "#57534e",
      nameTop: 395,
    });
  } else {
    background("#f0f9ff");
    addRect(fabric, canvas, {
      left: 54,
      top: 54,
      width: WIDTH - 108,
      height: HEIGHT - 108,
      rx: 14,
      ry: 14,
      fill: "rgba(255,255,255,0.84)",
      stroke: "#0284c7",
      strokeWidth: 5,
      selectable: false,
      evented: false,
    });
    addRect(fabric, canvas, {
      left: 86,
      top: 86,
      width: WIDTH - 172,
      height: HEIGHT - 172,
      rx: 8,
      ry: 8,
      fill: "rgba(255,255,255,0)",
      stroke: "#bae6fd",
      strokeWidth: 2,
      selectable: false,
      evented: false,
    });
    addRect(fabric, canvas, {
      left: 116,
      top: 124,
      width: 210,
      height: 5,
      fill: "#0284c7",
      selectable: false,
      evented: false,
    });
    addRect(fabric, canvas, {
      left: WIDTH - 326,
      top: HEIGHT - 132,
      width: 210,
      height: 5,
      fill: "#0284c7",
      selectable: false,
      evented: false,
    });
    addCertificateCopy(fabric, canvas, {
      accent: "#0284c7",
      body: "Đào tạo nội bộ - Bệnh viện HMDL",
      footer: "Số: {{MA_CHUNG_CHI}}        Ngày cấp: {{NGAY_CAP}}",
      titleColor: "#0f172a",
      muted: "#64748b",
      titleTop: 185,
      nameTop: 415,
    });
  }

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
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<EditableCanvas | null>(null);
  const fabricRef = useRef<FabricModule | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("Mẫu chứng chỉ HMDL");
  const [courseId, setCourseId] = useState(ALL_COURSES);
  const [placeholder, setPlaceholder] = useState<string>(CERTIFICATE_PLACEHOLDERS[0].key);
  const [templatePreset, setTemplatePreset] = useState<TemplatePresetId>("medical-blue");

  const courseLabel = useMemo(() => {
    if (courseId === ALL_COURSES) return "dùng chung";
    return courses.find((course) => course.id === courseId)?.title ?? "khóa học";
  }, [courseId, courses]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const fabric = await import("fabric");
      if (!mounted || !canvasElementRef.current) return;
      await waitForCertificateFonts();

      const canvas = new fabric.Canvas(canvasElementRef.current, {
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: "#ffffff",
        preserveObjectStacking: true,
      }) as unknown as EditableCanvas;

      fabricRef.current = fabric;
      canvasRef.current = canvas;
      setCanvasDefaults(fabric, canvas, templatePreset);
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
  }, [templatePreset]);

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
      fontFamily: CERT_FONT,
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

  const removeBackgroundImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas
      .getObjects()
      .filter((object) => (object as FabricObjectLike).name === "background-image")
      .forEach((object) => canvas.remove(object));
    canvas.renderAll();
  };

  const addBackgroundImage = (dataUrl: string) => {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;

    removeBackgroundImage();
    void fabric.Image.fromURL(dataUrl, { crossOrigin: "anonymous" }).then(
      (image) => {
        image.set({
          left: 0,
          top: 0,
          width: WIDTH,
          height: HEIGHT,
          scaleX: WIDTH / (image.width || WIDTH),
          scaleY: HEIGHT / (image.height || HEIGHT),
          opacity: 0.22,
          selectable: false,
          evented: false,
          name: "background-image",
        });
        canvas.add(image);
        canvas.sendToBack(image);
        canvas
          .getObjects()
          .filter((object) => (object as FabricObjectLike).name === "background-fill")
          .forEach((object) => canvas.sendToBack(object));
        canvas.renderAll();
      }
    );
  };

  const handleBackgroundUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh.");
      return;
    }

    try {
      const dataUrl = await prepareBackgroundImage(file);
      addBackgroundImage(dataUrl);
      toast.success("Đã thêm ảnh nền vào template.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thêm được ảnh nền.");
    } finally {
      if (backgroundInputRef.current) backgroundInputRef.current.value = "";
    }
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
      canvasJSON: canvas.toJSON(["selectable", "name"]),
      width: WIDTH,
      height: HEIGHT,
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label>Tên mẫu</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Thư viện template</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATE_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  variant={templatePreset === preset.id ? "default" : "outline"}
                  className="h-auto justify-start gap-2 px-3 py-2 text-left text-xs"
                  onClick={() => setTemplatePreset(preset.id)}
                >
                  <span className={`h-3 w-3 shrink-0 rounded-full ${preset.swatch}`} />
                  <span className="whitespace-normal leading-snug">{preset.label}</span>
                </Button>
              ))}
            </div>
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
            <Button type="button" variant="outline" onClick={() => backgroundInputRef.current?.click()}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Ảnh nền
            </Button>
            <Button type="button" variant="outline" onClick={removeBackgroundImage}>
              Xóa nền
            </Button>
            <Button type="button" variant="outline" onClick={() => {
              const fabric = fabricRef.current;
              const canvas = canvasRef.current;
              if (fabric && canvas) setCanvasDefaults(fabric, canvas, templatePreset);
            }}>
              <Palette className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button type="button" variant="outline" onClick={removeSelected}>
              <Trash2 className="mr-2 h-4 w-4" />
              Xóa
            </Button>
          </div>

          <input
            ref={backgroundInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleBackgroundUpload(event.target.files?.[0])}
          />

          <Button type="button" className="w-full" onClick={handleSave} disabled={!ready || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Lưu template
          </Button>

          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            Mã preview: {buildCertificateCodePreview()}. Bấm đúp vào chữ trên canvas để sửa trực tiếp.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <div className="flex max-h-[calc(100vh-21rem)] min-h-[360px] w-full items-start justify-center overflow-auto rounded-md border bg-slate-100 p-4 lg:max-h-[calc(100vh-19rem)]">
            <div className="aspect-[1320/934] w-full max-w-[min(100%,calc((100vh-24rem)*1.413))] min-w-0 overflow-hidden rounded-md bg-white shadow-sm lg:max-w-[min(100%,calc((100vh-22rem)*1.413))]">
              <canvas ref={canvasElementRef} className="!h-full !w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
