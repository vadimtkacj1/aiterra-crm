import * as pdfjs from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

interface Props {
  base64: string;
  style?: React.CSSProperties;
}

export function PdfViewer({ base64, style }: Props) {
  const [pageCount, setPageCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const taskRef = useRef<pdfjs.PDFDocumentLoadingTask | null>(null);

  useEffect(() => {
    let cancelled = false;

    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const task = pdfjs.getDocument({ data: bytes });
    taskRef.current = task;

    task.promise.then(async (pdf) => {
      if (cancelled) return;
      setPageCount(pdf.numPages);

      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) break;
        const page = await pdf.getPage(i);
        const container = containerRef.current;
        if (!container || cancelled) break;

        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = container.clientWidth || 600;
        const scale = containerWidth / viewport.width;
        const scaled = page.getViewport({ scale });

        const canvas = container.querySelector<HTMLCanvasElement>(`[data-page="${i}"]`);
        if (!canvas) break;
        canvas.width = scaled.width;
        canvas.height = scaled.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) break;
        await page.render({ canvasContext: ctx, viewport: scaled }).promise;
      }
    });

    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [base64]);

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
      {Array.from({ length: pageCount }, (_, i) => (
        <canvas
          key={i + 1}
          data-page={i + 1}
          style={{ width: "100%", borderRadius: i === 0 ? "12px 12px 0 0" : i === pageCount - 1 ? "0 0 12px 12px" : 0, display: "block" }}
        />
      ))}
    </div>
  );
}
