import { CheckCircle2, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import SignaturePad from "signature_pad";
import type { ContractPublic } from "../../../../../domain/Contract";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { message } from "@/lib/toast";
import { PdfViewer } from "../components/PdfViewer";
import { renderContractBody } from "../components/contractBodyRenderer";
import { Paths } from "@/ui/navigation/paths";

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
  "linear-gradient(165deg, #eef2f7 0%, #e2e8f0 38%, var(--ds-surface-2) 70%, var(--ds-surface-1) 100%)";
const cardShadow = "0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 12px 24px -4px rgba(15, 23, 42, 0.12)";
const panelShadow = "0 8px 30px -8px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(15, 23, 42, 0.06)";

export function ContractSignPage() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [contract, setContract] = useState<ContractPublic | null>(null);
  const nextStage = contract?.stages.find((stage) => stage.status !== "paid") ?? null;
  const nextStageAmountLabel = contract
    ? fmtMoney(nextStage ? nextStage.amount : contract.totalAmount, contract.currency)
    : "";
  const payButtonLabel = contract
    ? t("contracts.sign.payStageNow", { amount: nextStageAmountLabel })
    : t("contracts.sign.payNow");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [policiesAgreed, setPoliciesAgreed] = useState(false);
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
  const canSubmit = agreed && policiesAgreed && signerName.trim().length > 0 && emailOk && hasSignature;

  const handleSign = async () => {
    if (!token || !contract) return;
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      message.warning(t("contracts.sign.signatureRequired"));
      return;
    }
    if (!signerName.trim()) {
      message.warning(t("contracts.sign.nameRequired"));
      return;
    }
    if (!isValidEmail(recipientEmail)) {
      message.warning(t("contracts.sign.emailRequired"));
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
      if (updated.monthlyAmount && updated.monthlyAmount > 0) {
        navigate(`/contracts/sign/${token}/pay`);
        return;
      }
      setDone(true);
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: pageBg }}>
        <Spinner size="lg" />
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
          <h3 className="mb-2 mt-0 text-2xl font-semibold">{t("contracts.sign.notFound")}</h3>
          <span className="text-sm text-muted-foreground">{error}</span>
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
    const handlePayNow = () => {
      navigate(`/contracts/sign/${token}/pay`);
    };
    const isSubscription = !!(contract.monthlyAmount && contract.monthlyAmount > 0);
    const subscriptionActive = contract.subscriptionStatus === "active";
    const allPaid = !nextStage;
    const showPayButton = !allPaid && (!isSubscription || !subscriptionActive);
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
          <CheckCircle2
            aria-hidden="true"
            className="mx-auto mb-5 size-14"
            style={{ color: "var(--ds-color-success)" }}
          />
          <h3 className="mb-3 mt-0 text-2xl font-semibold">{t("contracts.sign.successTitle")}</h3>
          {isSubscription && subscriptionActive && (
            <span className="mb-6 block text-sm text-muted-foreground">
              {t("contracts.sign.subscriptionActiveNote")}
            </span>
          )}
          {isSubscription && !subscriptionActive && (
            <span className="mb-6 block text-sm text-muted-foreground">
              {t("contracts.sign.subscriptionPayFirst")}
            </span>
          )}
          {!isSubscription && allPaid && (
            <span className="mb-6 block text-sm text-muted-foreground">
              {t("contracts.sign.paymentStatusPaid")}
            </span>
          )}
          {!isSubscription && !allPaid && (
            <div style={{ marginBottom: 24 }} />
          )}
          <div className="flex flex-col gap-3">
            {showPayButton && (
              <Button onClick={handlePayNow} className="h-11 rounded-[10px]">
                {payButtonLabel}
              </Button>
            )}
            {contract.pdfBase64 ? (
              <Button variant="outline" onClick={downloadPdf} className="h-11 rounded-[10px]">
                {t("contracts.sign.downloadSignedPdf")}
              </Button>
            ) : null}
            <Button variant="outline" asChild className="h-11 rounded-[10px]">
              <a href="/">{t("contracts.sign.backToSite")}</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const stageCount = contract.stages.length;
  const termsLinkStyle: CSSProperties = {
    fontWeight: 600,
    color: "var(--ds-text-link)",
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
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "var(--ds-text-secondary)", fontWeight: 500 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--ds-color-primary-surface-deep) 0%, var(--ds-color-primary-surface-muted) 100%)",
              color: "var(--ds-color-primary)",
            }}
          >
            <ShieldCheck aria-hidden="true" className="size-4.5" />
          </span>
          {t("contracts.sign.secureLabel")}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ds-text-tertiary)" }}>
          <Lock aria-hidden="true" className="size-3.5" />
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
            <span
              className="mb-2.5 block text-[11px] font-bold uppercase text-(--ds-text-secondary)"
              style={{ letterSpacing: "0.1em" }}
            >
              {t("contracts.sign.contractLabel")}
            </span>
            <h2
              className="mb-5 mt-0 text-3xl font-bold tracking-[-0.02em]"
              style={{ color: "var(--ds-text-primary)" }}
            >
              {contract.title}
            </h2>

            {contract.body && (
              <div
                style={{
                  marginBottom: 24,
                  background: "var(--ds-surface-1)",
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

            {contract.pdfBase64 && (() => {
              const openPdf = () => {
                const bytes = Uint8Array.from(atob(contract.pdfBase64!), (c) => c.charCodeAt(0));
                const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
                window.open(url, "_blank");
                setTimeout(() => URL.revokeObjectURL(url), 10_000);
              };
              const isMobile = window.innerWidth < 768;
              return (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span className="text-xs text-muted-foreground">
                      {t("contracts.sign.attachedPdf")}
                    </span>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={openPdf}>
                      {t("contracts.sign.openPdf")}
                    </Button>
                  </div>
                  {isMobile ? (
                    <button
                      onClick={openPdf}
                      style={{
                        width: "100%",
                        padding: "20px 16px",
                        border: "2px dashed rgba(59,40,204,0.35)",
                        borderRadius: 12,
                        background: "linear-gradient(135deg,var(--ds-color-primary-surface),var(--ds-color-primary-surface-deep))",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        color: "var(--ds-color-primary)",
                        fontSize: 15,
                        fontWeight: 600,
                      }}
                    >
                      <span style={{ fontSize: 32 }}>📄</span>
                      {t("contracts.sign.tapToViewPdf")}
                      <span style={{ fontSize: 12, fontWeight: 400, color: "var(--ds-text-secondary)" }}>
                        {t("contracts.sign.tapToViewPdfSub")}
                      </span>
                    </button>
                  ) : (
                    <PdfViewer
                      base64={contract.pdfBase64}
                      style={{ border: "1px solid rgba(15,23,42,.1)", borderRadius: 12, overflow: "hidden" }}
                    />
                  )}
                </div>
              );
            })()}

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
                    background: "linear-gradient(180deg, var(--ds-surface-1) 0%, var(--ds-surface-2) 100%)",
                    borderBottom: "1px solid rgba(15,23,42,.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CreditCard aria-hidden="true" className="size-4.5 text-(--ds-text-secondary)" />
                    <span>
                      <span className="block text-sm font-semibold" style={{ color: "var(--ds-text-primary)" }}>
                        {t("contracts.sign.paymentStages")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t("contracts.sign.stagesSummary", { count: stageCount })}
                      </span>
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
                          background: "var(--ds-color-primary-surface-muted)",
                          color: "var(--ds-color-primary-dark)",
                          fontSize: 13,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ fontSize: 14, color: "#1e293b", lineHeight: 1.5 }}>
                        <strong>{t("contracts.sign.stage")} {i + 1}</strong>
                        {s.description ? `: ${s.description}` : ""}
                      </span>
                    </span>
                    <span
                      className="shrink-0 text-[15px] font-semibold tabular-nums"
                      style={{ color: "var(--ds-text-primary)" }}
                    >
                      {fmtMoney(s.amount, contract.currency)}
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "18px 18px",
                    background: "linear-gradient(180deg, #1e293b 0%, var(--ds-text-primary) 100%)",
                    color: "#fff",
                  }}
                >
                  <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>
                    {t("contracts.sign.total")}
                  </span>
                  <span className="text-[22px] font-semibold tabular-nums" style={{ color: "#fff" }}>
                    {fmtMoney(contract.totalAmount, contract.currency)}
                  </span>
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
                background: "linear-gradient(135deg, var(--ds-color-primary-surface) 0%, var(--ds-color-primary-surface-deep) 100%)",
                border: "1px solid rgba(59, 40, 204, 0.15)",
              }}
            >
              <span className="mb-1 block text-xs text-muted-foreground">
                {t("contracts.sign.totalLabel")}
              </span>
              <h2
                className="m-0 text-3xl font-extrabold tracking-[-0.03em] tabular-nums"
                style={{ color: "var(--ds-text-primary)" }}
              >
                {fmtMoney(contract.totalAmount, contract.currency)}
              </h2>
              {stageCount > 1 && (
                <span className="mt-1.5 block text-xs text-muted-foreground">
                  {t("contracts.sign.stagesSummary", { count: stageCount })}
                </span>
              )}
            </div>

            <div>
              <span className="mb-2 block text-[13px] font-semibold" style={{ color: "#334155" }}>
                {t("contracts.sign.yourName")}
              </span>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder={t("contracts.sign.yourNamePlaceholder")}
                className="h-10 rounded-[10px]"
              />
            </div>

            <div>
              <span className="mb-2 block text-[13px] font-semibold" style={{ color: "#334155" }}>
                {t("contracts.sign.recipientEmail")}
              </span>
              <span className="mb-2 block text-xs text-muted-foreground">
                {t("contracts.sign.recipientEmailHint")}
              </span>
              {/* LTR island: email must not inherit RTL or typing/cursor breaks in Hebrew UI */}
              <div dir="ltr" lang="en" style={{ direction: "ltr" }}>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder={t("contracts.sign.recipientEmailPlaceholder")}
                  className="h-10 rounded-[10px]"
                  style={{ textAlign: "left", unicodeBidi: "plaintext" }}
                />
              </div>
            </div>

            <div>
              <span className="mb-1 block text-[13px] font-semibold" style={{ color: "#334155" }}>
                {t("contracts.sign.signHere")}
              </span>
              <span className="mb-2.5 block text-xs text-muted-foreground">
                {t("contracts.sign.signatureHint")}
              </span>
              <div
                ref={wrapRef}
                style={{
                  borderRadius: 12,
                  border: `2px dashed ${hasSignature ? "rgba(59, 40, 204, 0.35)" : "rgba(15,23,42,.18)"}`,
                  background: "var(--ds-surface-1)",
                  width: "100%",
                  transition: "border-color 0.2s ease",
                }}
              >
                <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: 192, touchAction: "none" }} />
              </div>
              <div style={{ textAlign: "end", marginTop: 6 }}>
                <Button variant="link" size="sm" onClick={clearSignature} className="pe-0">
                  {t("contracts.sign.clearSignature")}
                </Button>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2">
              <Checkbox
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="mt-0.5"
              />
              <span className="text-[13px] leading-[1.65]" style={{ color: "#334155" }}>
                <Trans
                  i18nKey="contracts.sign.acceptTermsHtml"
                  components={{
                    terms: <a href="#contract-terms" style={termsLinkStyle} onClick={scrollToTerms} />,
                  }}
                />
              </span>
            </label>

            <label className="mt-1 flex cursor-pointer items-start gap-2">
              <Checkbox
                checked={policiesAgreed}
                onCheckedChange={(checked) => setPoliciesAgreed(checked === true)}
                className="mt-0.5"
              />
              <span className="text-[13px] leading-[1.65]" style={{ color: "#334155" }}>
                <Trans
                  i18nKey="contracts.sign.acceptPoliciesHtml"
                  components={{
                    terms: <a href={Paths.terms} target="_blank" rel="noreferrer" style={termsLinkStyle} />,
                    privacy: <a href={Paths.privacyPolicy} target="_blank" rel="noreferrer" style={termsLinkStyle} />,
                    cancel: <a href={Paths.cancelPolicy} target="_blank" rel="noreferrer" style={termsLinkStyle} />,
                  }}
                />
              </span>
            </label>

            {!canSubmit && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ds-text-secondary)",
                  lineHeight: 1.65,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--ds-surface-1)",
                  border: "1px dashed rgba(15,23,42,.12)",
                }}
              >
                <span className="mb-1.5 block text-xs font-semibold" style={{ color: "var(--ds-text-secondary)" }}>
                  {t("contracts.sign.completeToSign")}
                </span>
                {!signerName.trim() && <div>• {t("contracts.sign.needName")}</div>}
                {!emailOk && <div>• {t("contracts.sign.needEmail")}</div>}
                {!hasSignature && <div>• {t("contracts.sign.needSignature")}</div>}
                {!agreed && <div>• {t("contracts.sign.needTerms")}</div>}
              </div>
            )}

            <Button
              size="lg"
              disabled={!canSubmit || submitting}
              onClick={() => void handleSign()}
              className="h-12.5 w-full rounded-xl text-base font-bold"
              style={{
                boxShadow: canSubmit ? "0 4px 14px rgba(59, 40, 204, 0.35)" : undefined,
              }}
            >
              {submitting ? (
                <Spinner size="sm" className="text-current" aria-hidden="true" />
              ) : canSubmit ? (
                <CheckCircle2 aria-hidden="true" />
              ) : null}
              {t("contracts.sign.submit")}
            </Button>
          </aside>
        </div>
      </main>
    </div>
  );
}
