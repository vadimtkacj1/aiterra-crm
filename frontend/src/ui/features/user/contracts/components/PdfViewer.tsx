import { useEffect, useState } from "react";

interface Props {
  base64: string;
  style?: React.CSSProperties;
}

export function PdfViewer({ base64, style }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    const raw = (base64.includes(",") ? base64.split(",")[1] : base64).replace(/\s/g, "");
    let url: string | null = null;
    try {
      const binary = atob(raw);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      setBlobUrl(url);
    } catch (e) {
      console.error("[PdfViewer] decode failed:", e);
      setError(true);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
      setBlobUrl(null);
    };
  }, [base64]);

  if (error) {
    return (
      <div style={{ color: "#ef4444", padding: 12, fontSize: 13, ...style }}>
        שגיאה בטעינת המסמך
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div style={{ color: "#94a3b8", padding: 16, fontSize: 13, textAlign: "center", minHeight: 120, ...style }}>
        טוען מסמך…
      </div>
    );
  }

  return (
    <object
      data={blobUrl}
      type="application/pdf"
      style={{ display: "block", width: "100%", height: 720, minHeight: 400, border: "none", ...style }}
    >
      {/* Fallback for browsers without built-in PDF viewer */}
      <div style={{ padding: 16, fontSize: 13, color: "#64748b", textAlign: "center" }}>
        <a href={blobUrl} target="_blank" rel="noreferrer">פתח מסמך PDF</a>
      </div>
    </object>
  );
}
