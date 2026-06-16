import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import puppeteer from "puppeteer-core";
import QRCode from "qrcode";

import type { CertificatePlaceholderData } from "@/lib/certificate/placeholders";
import { getCertificateEnv } from "@/lib/env";
import type { Json } from "@/types/database.types";

const CERT_FONT = "Noto Sans";

type RenderInput = {
  templateJSON: Json;
  width: number;
  height: number;
  data: CertificatePlaceholderData;
  verifyUrl: string;
};

function getBrowserlessEndpoint() {
  const env = getCertificateEnv();
  const endpoint = env.BROWSERLESS_WS_ENDPOINT || env.BROWSERLESS_URL;
  const token = env.BROWSERLESS_TOKEN;

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
  const fabricPath = fileURLToPath(new URL("../../../node_modules/fabric/dist/index.min.js", import.meta.url));
  return readFile(fabricPath, "utf8");
}

async function getCertificateFontCss() {
  const fontFiles = [
    {
      weight: 400,
      path: fileURLToPath(new URL("../../../public/fonts/noto-sans-vietnamese-400-normal.woff", import.meta.url)),
    },
    {
      weight: 600,
      path: fileURLToPath(new URL("../../../public/fonts/noto-sans-vietnamese-600-normal.woff", import.meta.url)),
    },
    {
      weight: 700,
      path: fileURLToPath(new URL("../../../public/fonts/noto-sans-vietnamese-700-normal.woff", import.meta.url)),
    },
  ];

  const rules = await Promise.all(
    fontFiles.map(async (font) => {
      const data = await readFile(font.path);
      return `
        @font-face {
          font-family: "${CERT_FONT}";
          src: url("data:font/woff;base64,${data.toString("base64")}") format("woff");
          font-weight: ${font.weight};
          font-style: normal;
          font-display: block;
        }`;
    })
  );

  return rules.join("\n");
}

function buildRenderHtml(input: RenderInput & { fabricScript: string; fontCss: string; qrDataUrl: string }) {
  const fabricScript = input.fabricScript.replace(/<\/script/gi, "<\\/script");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    ${input.fontCss}
    @page { size: A4 landscape; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: "${CERT_FONT}", Arial, sans-serif;
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
            fontFamily: "${CERT_FONT}",
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
      await document.fonts.ready;
      canvas.getObjects().forEach((object) => {
        if (["text", "textbox", "i-text"].includes(object.type)) {
          object.set("text", replacePlaceholders(object.text));
          object.set("fontFamily", "${CERT_FONT}");
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
  const [fabricScript, fontCss, qrDataUrl] = await Promise.all([
    getFabricScript(),
    getCertificateFontCss(),
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

    await page.setContent(buildRenderHtml({ ...input, fabricScript, fontCss, qrDataUrl }), {
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
