import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { useEffect, useRef } from "react";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

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
    container.innerHTML = '<div style="color:#94a3b8;padding:16px;font-size:13px;text-align:center">טוען מסמך…</div>';

    // Convert base64 → Uint8Array
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const task = pdfjs.getDocument({ data: bytes });

    task.promise
      .then(async (pdf) => {
        if (cancelled) return;
        container.innerHTML = "";

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) break;

          const page = await pdf.getPage(pageNum);
          if (cancelled) break;

          // clientWidth after paint should be non-zero; fallback to 360 on mobile
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
      .catch(() => {
        if (cancelled) return;
        container.innerHTML =
          '<div style="color:#ef4444;padding:12px;font-size:13px">שגיאה בטעינת המסמך</div>';
      });

    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [base64]);

  return <div ref={containerRef} style={{ minHeight: 120, ...style }} />;
}
