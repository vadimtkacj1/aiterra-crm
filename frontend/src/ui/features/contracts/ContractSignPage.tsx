import { CheckCircleOutlined, CreditCardOutlined, LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { App, Button, Checkbox, Input, Spin, Typography } from "antd";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import SignaturePad from "signature_pad";
import type { ContractPublic } from "../../../domain/Contract";
import { renderContractBody } from "./contractBodyRenderer";

function fmtMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "ILS").toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

async function fetchContract(token: string): Promise<ContractPublic> {
  const res = await fetch(`/api/contracts/${token}`);
  if (!res.ok) {
    const data = (await res.json()) as { detail?: string };
    throw new Error(data.detail ?? "error");
  }
  return res.json() as Promise<ContractPublic>;
}

function isValidEmail(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

async function submitSignature(
  token: string,
  signerName: string,
  recipientEmail: string,
  signaturePng: string,
  locale: string,
): Promise<ContractPublic> {
  const res = await fetch(`/api/contracts/${token}/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      signerName,
      signerPosition: "",
      recipientEmail: recipientEmail.trim(),
      signaturePngBase64: signaturePng,
      locale,
    }),
  });
  if (!res.ok) {
    const data = (await res.json()) as { detail?: string };
    throw new Error(data.detail ?? "error");
  }
  return res.json() as Promise<ContractPublic>;
}

const pageBg =
  "linear-gradient(165deg, #eef2f7 0%, #e2e8f0 38%, #f1f5f9 70%, #f8fafc 100%)";
const cardShadow = "0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 12px 24px -4px rgba(15, 23, 42, 0.12)";
const panelShadow = "0 8px 30px -8px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(15, 23, 42, 0.06)";

export function ContractSignPage() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();

  const [contract, setContract] = useState<ContractPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  /** Raw base64 PNG of the last submitted signature (public API does not return it). */
  const [submittedSignaturePng, setSubmittedSignaturePng] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<SignaturePad | null>(null);

  const scrollToTerms = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById("contract-terms")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchContract(token)
      .then(setContract)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "error"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || !contract || contract.status === "signed") return;

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgb(255,255,255)",
      penColor: "rgb(15,23,42)",
      minWidth: 0.8,
      maxWidth: 2.2,
    });
    padRef.current = pad;

    const syncSig = () => setHasSignature(!pad.isEmpty());
    pad.addEventListener("endStroke", syncSig);

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const w = Math.max(wrap.clientWidth, 280);
      const h = 192;
      canvas.width = w * ratio;
      canvas.height = h * ratio;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(ratio, ratio);
      }
      pad.clear();
      setHasSignature(false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    return () => {
      ro.disconnect();
      pad.removeEventListener("endStroke", syncSig);
      pad.off();
      padRef.current = null;
    };
  }, [contract]);

  const clearSignature = () => {
    padRef.current?.clear();
    setHasSignature(false);
  };

  const emailOk = isValidEmail(recipientEmail);
  const canSubmit = agreed && signerName.trim().length > 0 && emailOk && hasSignature;

  const handleSign = async () => {
    if (!token || !contract) return;
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      void message.warning(t("contracts.sign.signatureRequired"));
      return;
    }
    if (!signerName.trim()) {
      void message.warning(t("contracts.sign.nameRequired"));
      return;
    }
    if (!isValidEmail(recipientEmail)) {
      void message.warning(t("contracts.sign.emailRequired"));
      return;
    }
    if (!agreed) return;

    setSubmitting(true);
    try {
      const rawPng = pad.toDataURL("image/png");
      const base64 = rawPng.includes(",") ? rawPng.split(",")[1] : rawPng;
      setSubmittedSignaturePng(base64!);
      const updated = await submitSignature(token, signerName, recipientEmail, base64!, i18n.language);
      setContract(updated);
      setDone(true);
    } catch (e) {
      void message.error(e instanceof Error ? e.message : t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: pageBg }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: pageBg }}>
        <div
          style={{
            textAlign: "center",
            maxWidth: 400,
            padding: "40px 32px",
            background: "#fff",
            borderRadius: 16,
            boxShadow: cardShadow,
            border: "1px solid rgba(15,23,42,.08)",
          }}
        >
          <Typography.Title level={3} style={{ marginBottom: 8 }}>
            {t("contracts.sign.notFound")}
          </Typography.Title>
          <Typography.Text type="secondary">{error}</Typography.Text>
        </div>
      </div>
    );
  }

  if (done || contract.status === "signed") {
    const safeName = `${(contract.title || "contract").replace(/[^\w\-]+/g, "_").slice(0, 60) || "contract"}.pdf`;
    const downloadPdf = () => {
      if (!contract.pdfBase64) return;
      const bytes = Uint8Array.from(atob(contract.pdfBase64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = safeName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    };
    return (
      <div style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            border: "1px solid rgba(15,23,42,.08)",
            boxShadow: panelShadow,
            padding: "48px 40px",
            maxWidth: 440,
            width: "100%",
            textAlign: "center",
          }}
        >
          <CheckCircleOutlined style={{ fontSize: 56, color: "#16a34a", marginBottom: 20 }} />
          <Typography.Title level={3} style={{ margin: "0 0 24px" }}>
            {t("contracts.sign.successTitle")}
          </Typography.Title>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {contract.pdfBase64 ? (
              <Button type="primary" onClick={downloadPdf} style={{ borderRadius: 10, height: 44 }}>
                {t("contracts.sign.downloadSignedPdf")}
              </Button>
            ) : null}
            <Button href="/" style={{ borderRadius: 10, height: 44 }}>
              {t("contracts.sign.backToSite")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const stageCount = contract.stages.length;
  const termsLinkStyle: CSSProperties = {
    fontWeight: 600,
    color: "#2563eb",
    textDecoration: "underline",
    textUnderlineOffset: 2,
  };

  return (
    <div style={{ minHeight: "100vh", background: pageBg, display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "14px 28px",
          borderBottom: "1px solid rgba(15,23,42,.08)",
          background: "rgba(255,255,255,.92)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#475569", fontWeight: 500 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)",
              color: "#1d4ed8",
            }}
          >
            <SafetyCertificateOutlined />
          </span>
          {t("contracts.sign.secureLabel")}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
          <LockOutlined />
          {t("contracts.sign.encryptionNote")}
        </span>
      </header>

      <main style={{ flex: 1, display: "flex", justifyContent: "center", padding: "32px 20px 56px" }}>
        <div
          style={{
            width: "100%",
            maxWidth: 1080,
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 380px)",
            gap: 28,
            alignItems: "start",
          }}
          className="contract-sign-grid"
        >
          <style>{`
            @media (max-width: 900px) {
              .contract-sign-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>

          {/* Contract column */}
          <div
            id="contract-terms"
            style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid rgba(15,23,42,.09)",
              boxShadow: cardShadow,
              padding: "28px 28px 32px",
              scrollMarginTop: 24,
            }}
          >
            <Typography.Text
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#64748b",
                display: "block",
                marginBottom: 10,
              }}
            >
              {t("contracts.sign.contractLabel")}
            </Typography.Text>
            <Typography.Title level={2} style={{ margin: "0 0 20px", fontWeight: 700, letterSpacing: "-0.02em", color: "#0f172a" }}>
              {contract.title}
            </Typography.Title>

            {contract.body && (
              <div
                style={{
                  marginBottom: 24,
                  background: "#f8fafc",
                  borderRadius: 12,
                  border: "1px solid rgba(15,23,42,.06)",
                  padding: "20px 22px",
                  fontSize: 14,
                  lineHeight: 1.85,
                  color: "#334155",
                }}
              >
                {renderContractBody(contract.body, {
                  signerName: done ? signerName || contract.signerName : null,
                  signaturePngBase64: done ? submittedSignaturePng : null,
                  signedAt: done ? (contract.signedAt ?? new Date().toISOString()) : null,
                })}
              </div>
            )}

            {contract.pdfBase64 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {t("contracts.sign.attachedPdf")}
                  </Typography.Text>
                  <Button
                    size="small"
                    type="link"
                    style={{ padding: 0, fontSize: 12 }}
                    onClick={() => {
                      const bytes = Uint8Array.from(atob(contract.pdfBase64!), (c) => c.charCodeAt(0));
                      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
                      window.open(url, "_blank");
                      setTimeout(() => URL.revokeObjectURL(url), 10_000);
                    }}
                  >
                    {t("contracts.sign.openPdf")}
                  </Button>
                </div>
                <iframe
                  src={`data:application/pdf;base64,${contract.pdfBase64}`}
                  style={{
                    width: "100%",
                    height: "80vh",
                    minHeight: 600,
                    border: "1px solid rgba(15,23,42,.1)",
                    borderRadius: 12,
                  }}
                  title="contract-pdf"
                />
              </div>
            )}

            {stageCount > 0 && (
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(15,23,42,.1)",
                  overflow: "hidden",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    padding: "14px 18px",
                    background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                    borderBottom: "1px solid rgba(15,23,42,.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CreditCardOutlined style={{ fontSize: 18, color: "#475569" }} />
                    <span>
                      <Typography.Text strong style={{ display: "block", fontSize: 14, color: "#0f172a" }}>
                        {t("contracts.sign.paymentStages")}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {t("contracts.sign.stagesSummary", { count: stageCount })}
                      </Typography.Text>
                    </span>
                  </span>
                </div>
                {contract.stages.map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      padding: "16px 18px",
                      borderTop: i > 0 ? "1px solid rgba(15,23,42,.06)" : undefined,
                      background: i % 2 === 0 ? "#fff" : "#fafbfc",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
                      <span
                        style={{
                          flexShrink: 0,
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "#e0e7ff",
                          color: "#3730a3",
                          fontSize: 13,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {i + 1}
                      </span>
                      <Typography.Text style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.5 }}>
                        <strong>{t("contracts.sign.stage")} {i + 1}</strong>
                        {s.description ? `: ${s.description}` : ""}
                      </Typography.Text>
                    </span>
                    <Typography.Text
                      strong
                      style={{
                        fontSize: 15,
                        fontVariantNumeric: "tabular-nums",
                        color: "#0f172a",
                        flexShrink: 0,
                      }}
                    >
                      {fmtMoney(s.amount, contract.currency)}
                    </Typography.Text>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "18px 18px",
                    background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
                    color: "#fff",
                  }}
                >
                  <Typography.Text strong style={{ color: "#e2e8f0", fontSize: 14 }}>
                    {t("contracts.sign.total")}
                  </Typography.Text>
                  <Typography.Text strong style={{ color: "#fff", fontSize: 22, fontVariantNumeric: "tabular-nums" }}>
                    {fmtMoney(contract.totalAmount, contract.currency)}
                  </Typography.Text>
                </div>
              </div>
            )}
          </div>

          {/* Sign panel */}
          <aside
            style={{
              position: "sticky",
              top: 24,
              background: "#fff",
              borderRadius: 16,
              border: "1px solid rgba(15,23,42,.1)",
              boxShadow: panelShadow,
              padding: "26px 26px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 12,
                background: "linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)",
                border: "1px solid rgba(37, 99, 235, 0.15)",
              }}
            >
              <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                {t("contracts.sign.totalLabel")}
              </Typography.Text>
              <Typography.Title level={2} style={{ margin: 0, fontWeight: 800, letterSpacing: "-0.03em", color: "#0f172a" }}>
                {fmtMoney(contract.totalAmount, contract.currency)}
              </Typography.Title>
              {stageCount > 1 && (
                <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 6, display: "block" }}>
                  {t("contracts.sign.stagesSummary", { count: stageCount })}
                </Typography.Text>
              )}
            </div>

            <div>
              <Typography.Text strong style={{ fontSize: 13, display: "block", marginBottom: 8, color: "#334155" }}>
                {t("contracts.sign.yourName")}
              </Typography.Text>
              <Input
                size="large"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder={t("contracts.sign.yourNamePlaceholder")}
                style={{ borderRadius: 10 }}
              />
            </div>

            <div>
              <Typography.Text strong style={{ fontSize: 13, display: "block", marginBottom: 8, color: "#334155" }}>
                {t("contracts.sign.recipientEmail")}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                {t("contracts.sign.recipientEmailHint")}
              </Typography.Text>
              {/* LTR island: email must not inherit RTL or typing/cursor breaks in Hebrew UI */}
              <div dir="ltr" lang="en" style={{ direction: "ltr" }}>
                <Input
                  size="large"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder={t("contracts.sign.recipientEmailPlaceholder")}
                  style={{ borderRadius: 10, textAlign: "left", unicodeBidi: "plaintext" }}
                />
              </div>
            </div>

            <div>
              <Typography.Text strong style={{ fontSize: 13, display: "block", marginBottom: 4, color: "#334155" }}>
                {t("contracts.sign.signHere")}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 10 }}>
                {t("contracts.sign.signatureHint")}
              </Typography.Text>
              <div
                ref={wrapRef}
                style={{
                  borderRadius: 12,
                  border: `2px dashed ${hasSignature ? "rgba(37, 99, 235, 0.35)" : "rgba(15,23,42,.18)"}`,
                  background: "#fafafa",
                  width: "100%",
                  transition: "border-color 0.2s ease",
                }}
              >
                <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: 192, touchAction: "none" }} />
              </div>
              <div style={{ textAlign: "end", marginTop: 6 }}>
                <Button type="link" size="small" onClick={clearSignature} style={{ paddingRight: 0 }}>
                  {t("contracts.sign.clearSignature")}
                </Button>
              </div>
            </div>

            <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)}>
              <Typography.Text style={{ fontSize: 13, lineHeight: 1.65, color: "#334155" }}>
                <Trans
                  i18nKey="contracts.sign.acceptTermsHtml"
                  components={{
                    terms: <a href="#contract-terms" style={termsLinkStyle} onClick={scrollToTerms} />,
                  }}
                />
              </Typography.Text>
            </Checkbox>

            {!canSubmit && (
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  lineHeight: 1.65,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#f8fafc",
                  border: "1px dashed rgba(15,23,42,.12)",
                }}
              >
                <Typography.Text strong style={{ fontSize: 12, color: "#475569", display: "block", marginBottom: 6 }}>
                  {t("contracts.sign.completeToSign")}
                </Typography.Text>
                {!signerName.trim() && <div>• {t("contracts.sign.needName")}</div>}
                {!emailOk && <div>• {t("contracts.sign.needEmail")}</div>}
                {!hasSignature && <div>• {t("contracts.sign.needSignature")}</div>}
                {!agreed && <div>• {t("contracts.sign.needTerms")}</div>}
              </div>
            )}

            <Button
              type="primary"
              size="large"
              block
              disabled={!canSubmit}
              loading={submitting}
              onClick={() => void handleSign()}
              icon={canSubmit ? <CheckCircleOutlined /> : undefined}
              style={{
                height: 50,
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 16,
                boxShadow: canSubmit ? "0 4px 14px rgba(37, 99, 235, 0.35)" : undefined,
              }}
            >
              {t("contracts.sign.submit")}
            </Button>
          </aside>
        </div>
      </main>
    </div>
  );
}
