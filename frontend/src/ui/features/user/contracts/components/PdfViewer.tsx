import * as pdfjs from "pdfjs-dist";
import { useEffect, useRef } from "react";

let workerBlobUrl: string | null = null;

async function getWorkerSrc(): Promise<string> {
  if (workerBlobUrl) return workerBlobUrl;
  const resp = await fetch("/pdf.worker.min.mjs");
  const text = await resp.text();
  workerBlobUrl = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
  return workerBlobUrl;
}

interface Props {
  base64: string;
  style?: React.CSSProperties;
}

export function PdfViewer({ base64, style }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let pdfDoc: pdfjs.PDFDocumentProxy | null = null;
    let renderGen = 0;

    container.innerHTML =
      '<div style="color:#94a3b8;padding:16px;font-size:13px;text-align:center">טוען מסמך…</div>';

    const raw = (base64.includes(",") ? base64.split(",")[1] : base64).replace(/\s/g, "");
    let bytes: Uint8Array;
    try {
      const binary = atob(raw);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } catch (e) {
      console.error("[PdfViewer] atob failed:", e);
      container.innerHTML =
        '<div style="color:#ef4444;padding:12px;font-size:13px">שגיאה בטעינת המסמך</div>';
      return;
    }

    const renderPages = async (pdf: pdfjs.PDFDocumentProxy) => {
      const gen = ++renderGen;
      const w = container.getBoundingClientRect().width || container.clientWidth || 360;
      if (w < 10) return; // layout not settled yet

      container.innerHTML = "";

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (cancelled || renderGen !== gen) break;
        const page = await pdf.getPage(pageNum);
        if (cancelled || renderGen !== gen) break;

        const dpr = Math.max(window.devicePixelRatio || 1, 1);
        const base = page.getViewport({ scale: 1 });
        // Render at physical pixels so text positions align on high-DPI screens
        const scaled = page.getViewport({ scale: (w / base.width) * dpr });

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(scaled.width);
        canvas.height = Math.floor(scaled.height);
        canvas.style.display = "block";
        canvas.style.width = "100%";
        // height auto-follows aspect ratio from canvas.width/canvas.height
        if (pageNum < pdf.numPages) canvas.style.marginBottom = "4px";
        container.appendChild(canvas);

        await page.render({ canvas, viewport: scaled }).promise;
      }
    };

    let task: ReturnType<typeof pdfjs.getDocument> | null = null;

    getWorkerSrc()
      .then((workerSrc) => {
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        task = pdfjs.getDocument({ data: bytes });
        return task.promise;
      })
      .then(async (pdf) => {
        if (!pdf || cancelled) return;
        pdfDoc = pdf;
        await renderPages(pdf);
      })
      .catch((err: unknown) => {
        console.error("[PdfViewer] error:", err);
        if (cancelled) return;
        container.innerHTML =
          '<div style="color:#ef4444;padding:12px;font-size:13px">שגיאה בטעינת המסמך</div>';
      });

    // Re-render whenever the container changes width (e.g. grid layout settling, window resize)
    let resizeTimer: ReturnType<typeof setTimeout>;
    let lastWidth = 0;
    const ro = new ResizeObserver((entries) => {
      const newWidth = Math.floor(entries[0]?.contentRect.width ?? 0);
      if (!pdfDoc || cancelled || newWidth === lastWidth || newWidth < 10) return;
      lastWidth = newWidth;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (pdfDoc && !cancelled) void renderPages(pdfDoc);
      }, 120);
    });
    ro.observe(container);

    return () => {
      cancelled = true;
      clearTimeout(resizeTimer);
      ro.disconnect();
      task?.destroy();
    };
  }, [base64]);

  return <div ref={containerRef} style={{ minHeight: 120, ...style }} />;
}
