import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

import puppeteer from "puppeteer-core";
import QRCode from "qrcode";

import type { CertificatePlaceholderData } from "@/lib/certificate/placeholders";
import type { Json } from "@/types/database.types";

const require = createRequire(import.meta.url);

type RenderInput = {
  templateJSON: Json;
  width: number;
  height: number;
  data: CertificatePlaceholderData;
  verifyUrl: string;
};

function getBrowserlessEndpoint() {
  const endpoint = process.env.BROWSERLESS_WS_ENDPOINT || process.env.BROWSERLESS_URL;
  const token = process.env.BROWSERLESS_TOKEN;

  if (!endpoint) {
    throw new Error("Thiếu BROWSERLESS_WS_ENDPOINT cho server-side certificate render.");
  }

  const url = new URL(endpoint);
  if (token && !url.searchParams.has("token")) {
    url.searchParams.set("token", token);
  }

  return url.toString();
}

function jsonForScript(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

async function getFabricScript() {
  const fabricPath = require.resolve("fabric/dist/fabric.min.js");
  return readFile(fabricPath, "utf8");
}

function buildRenderHtml(input: RenderInput & { fabricScript: string; qrDataUrl: string }) {
  const fabricScript = input.fabricScript.replace(/<\/script/gi, "<\\/script");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4 landscape; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    #certificate-canvas {
      display: block;
      width: ${input.width}px;
      height: ${input.height}px;
    }
    @media print {
      html, body {
        width: 297mm;
        height: 210mm;
      }
      #certificate-canvas {
        width: 297mm;
        height: 210mm;
      }
    }
  </style>
</head>
<body>
  <canvas id="certificate-canvas" width="${input.width}" height="${input.height}"></canvas>
  <script>${fabricScript}</script>
  <script>
    const templateJSON = ${jsonForScript(input.templateJSON)};
    const placeholderData = ${jsonForScript(input.data)};
    const qrDataUrl = ${jsonForScript(input.qrDataUrl)};
    const canvasWidth = ${input.width};
    const canvasHeight = ${input.height};

    function replacePlaceholders(text) {
      return String(text || "")
        .replaceAll("{{TEN_HOC_VIEN}}", placeholderData.studentName)
        .replaceAll("{{TEN_KHOA_HOC}}", placeholderData.courseName)
        .replaceAll("{{NGAY_CAP}}", placeholderData.issuedDate)
        .replaceAll("{{MA_CHUNG_CHI}}", placeholderData.certificateCode)
        .replaceAll("{{DIEM_SO}}", placeholderData.score || "");
    }

    function addQr(canvas) {
      return new Promise((resolve) => {
        fabric.Image.fromURL(qrDataUrl, (image) => {
          const targetSize = 140;
          const scaleX = targetSize / (image.width || targetSize);
          const scaleY = targetSize / (image.height || targetSize);
          image.set({
            left: canvasWidth - 190,
            top: canvasHeight - 205,
            scaleX,
            scaleY,
            selectable: false,
            evented: false,
          });
          canvas.add(image);

          const label = new fabric.Textbox("Quét mã xác thực", {
            left: canvasWidth - 235,
            top: canvasHeight - 58,
            width: 230,
            fontSize: 18,
            fill: "#475569",
            fontFamily: "Arial",
            textAlign: "center",
            selectable: false,
            evented: false,
          });
          canvas.add(label);
          resolve();
        });
      });
    }

    window.__CERT_READY__ = false;

    const canvas = new fabric.StaticCanvas("certificate-canvas", {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: "#ffffff",
      renderOnAddRemove: false,
    });

    canvas.loadFromJSON(templateJSON, async () => {
      canvas.getObjects().forEach((object) => {
        if (["text", "textbox", "i-text"].includes(object.type)) {
          object.set("text", replacePlaceholders(object.text));
        }
      });

      await addQr(canvas);
      canvas.renderAll();
      window.__CERT_READY__ = true;
    });
  </script>
</body>
</html>`;
}

export async function renderCertificateWithBrowserless(input: RenderInput) {
  const [fabricScript, qrDataUrl] = await Promise.all([
    getFabricScript(),
    QRCode.toDataURL(input.verifyUrl, { margin: 1, width: 180 }),
  ]);

  const browser = await puppeteer.connect({
    browserWSEndpoint: getBrowserlessEndpoint(),
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: input.width,
      height: input.height,
      deviceScaleFactor: 2,
    });

    await page.setContent(buildRenderHtml({ ...input, fabricScript, qrDataUrl }), {
      waitUntil: "networkidle0",
    });
    await page.waitForFunction("window.__CERT_READY__ === true", { timeout: 30_000 });

    const canvas = await page.$("#certificate-canvas");
    if (!canvas) {
      throw new Error("Không tìm thấy canvas chứng chỉ khi render.");
    }

    const pngBuffer = Buffer.from(await canvas.screenshot({ type: "png" }));
    const pdfBuffer = Buffer.from(
      await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        preferCSSPageSize: true,
      })
    );

    await page.close();
    return { pngBuffer, pdfBuffer };
  } finally {
    await browser.close();
  }
}

