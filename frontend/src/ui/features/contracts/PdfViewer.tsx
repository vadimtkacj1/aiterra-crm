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
        container.innerHTML = "";

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNum);
          if (cancelled) break;

          const w = container.getBoundingClientRect().width || container.clientWidth || 360;
          const base = page.getViewport({ scale: 1 });
          const scaled = page.getViewport({ scale: w / base.width });

          const canvas = document.createElement("canvas");
          canvas.width = scaled.width;
          canvas.height = scaled.height;
          canvas.style.display = "block";
          canvas.style.width = "100%";
          if (pageNum < pdf.numPages) canvas.style.marginBottom = "4px";
          container.appendChild(canvas);

          await page.render({ canvas, viewport: scaled }).promise;
        }
      })
      .catch((err: unknown) => {
        console.error("[PdfViewer] error:", err);
        if (cancelled) return;
        container.innerHTML =
          '<div style="color:#ef4444;padding:12px;font-size:13px">שגיאה בטעינת המסמך</div>';
      });

    return () => {
      cancelled = true;
      task?.destroy();
    };
  }, [base64]);

  return <div ref={containerRef} style={{ minHeight: 120, ...style }} />;
}
