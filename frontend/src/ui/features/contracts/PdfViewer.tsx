import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

interface Props {
  base64: string;
  style?: React.CSSProperties;
}

function PdfPage({ pdf, pageNum, width }: { pdf: PDFDocumentProxy; pageNum: number; width: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (rendered.current || !canvasRef.current || width === 0) return;
    rendered.current = true;

    pdf.getPage(pageNum).then((page) => {
      const viewport = page.getViewport({ scale: 1 });
      const scale = width / viewport.width;
      const scaled = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = scaled.width;
      canvas.height = scaled.height;
      page.render({ canvas, viewport: scaled });
    });
  }, [pdf, pageNum, width]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", width: "100%" }}
    />
  );
}

export function PdfViewer({ base64, style }: Props) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [width, setWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const task = pdfjs.getDocument({ data: bytes });
    task.promise.then(setPdf);
    return () => { task.destroy(); };
  }, [base64]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? 0);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  if (!pdf || width === 0) {
    return (
      <div
        ref={containerRef}
        style={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13, ...style }}
      >
        טוען מסמך…
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      {Array.from({ length: pdf.numPages }, (_, i) => (
        <PdfPage key={i + 1} pdf={pdf} pageNum={i + 1} width={width} />
      ))}
    </div>
  );
}
