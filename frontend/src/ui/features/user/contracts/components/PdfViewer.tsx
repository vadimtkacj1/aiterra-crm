import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  base64: string;
  style?: React.CSSProperties;
}

export function PdfViewer({ base64, style }: Props) {
  const { t } = useTranslation();
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
      <div style={{ color: "var(--ds-color-error)", padding: 12, fontSize: 13, ...style }}>
        {t("contracts.pdf.loadError")}
      </div>
    );
  }

  if (!blobUrl) {
    return (
      <div style={{ color: "var(--ds-text-tertiary)", padding: 16, fontSize: 13, textAlign: "center", minHeight: 120, ...style }}>
        {t("contracts.pdf.loading")}
      </div>
    );
  }

  return (
    <object
      data={blobUrl}
      type="application/pdf"
      style={{ display: "block", width: "100%", height: 720, minHeight: 400, border: "none", ...style }}
    >
      <div style={{ padding: 16, fontSize: 13, color: "var(--ds-text-secondary)", textAlign: "center" }}>
        <a href={blobUrl} target="_blank" rel="noreferrer">{t("contracts.pdf.open")}</a>
      </div>
    </object>
  );
}
