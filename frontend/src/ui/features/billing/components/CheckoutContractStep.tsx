import { Button, Checkbox, Flex, Typography } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import SignaturePad from "signature_pad";
import type { PendingPaymentAction } from "@/services/billing/IBillingService";
import { buildCheckoutContractPdfBlob } from "../../../shared/utils/checkoutContractPdf";
import { formatInvoiceMoney } from "./billingUtils";

function formatMoney(amount: number, currency: string): string {
  const cur = (currency || "ILS").length === 3 ? currency.toUpperCase() : "ILS";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

interface Props {
  payment: PendingPaymentAction;
  accountId: string;
  appLocale: string;
  submitting: boolean;
  onContinue: (signatureDataUrl: string) => void | Promise<void>;
}

export function CheckoutContractStep({ payment, accountId, appLocale, submitting, onContinue }: Props) {
  const { t, i18n } = useTranslation();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [readContract, setReadContract] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);

  const localizedClauses = useMemo(
    () => [
      t("billing.contract.clause1"),
      t("billing.contract.clause2"),
      t("billing.contract.clause3"),
      t("billing.contract.clause4"),
      t("billing.contract.clause5"),
    ],
    [t],
  );

  const englishClauses = useMemo(
    () => [
      t("billing.contract.enClause1"),
      t("billing.contract.enClause2"),
      t("billing.contract.enClause3"),
      t("billing.contract.enClause4"),
      t("billing.contract.enClause5"),
    ],
    [t],
  );

  useEffect(() => {
    const lines =
      payment.lineItems?.map((li) => ({
        label: li.code ? `${li.label} (${li.code})` : li.label,
        amount: formatInvoiceMoney(li.amount, payment.currency, appLocale),
      })) ?? [];

    const blob = buildCheckoutContractPdfBlob({
      title: t("billing.contract.pdfTitle"),
      paymentHeading: t("billing.contract.paymentSection"),
      summaryLine: payment.summary,
      amountLine: t("billing.contract.amountLine", {
        amount: formatMoney(payment.amount, payment.currency),
      }),
      lines: lines.length ? lines : undefined,
      englishClauses,
      footerNote: t("billing.contract.pdfFooter", { accountId }),
    });
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [payment, t, englishClauses, appLocale, accountId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgb(255,255,255)",
      penColor: "rgb(15,23,42)",
    });
    padRef.current = pad;
    pad.addEventListener("endStroke", () => {
      setHasSignature(!pad.isEmpty());
    });

    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const w = Math.max(wrap.clientWidth, 280);
      const h = 168;
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
    const ro = new ResizeObserver(() => resize());
    ro.observe(wrap);

    return () => {
      ro.disconnect();
      pad.off();
      padRef.current = null;
    };
  }, [i18n.language]);

  const clearSignature = () => {
    padRef.current?.clear();
    setHasSignature(false);
  };

  const handleContinue = async () => {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) return;
    if (!readContract) return;
    await onContinue(pad.toDataURL("image/png"));
  };

  const canContinue = readContract && hasSignature && !submitting;

  return (
    <div style={{ width: "100%", maxWidth: 880 }}>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
        {t("billing.contract.stepTitle")}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
        {t("billing.contract.stepIntro")}
      </Typography.Paragraph>

      <div
        style={{
          borderRadius: 12,
          border: "1px solid rgba(15,23,42,.1)",
          background: "#fff",
          overflow: "hidden",
          marginBottom: 16,
          boxShadow: "0 1px 8px rgba(15,23,42,.05)",
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid rgba(15,23,42,.06)",
            background: "#f8fafc",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          {t("billing.contract.pdfPreviewLabel")}
        </div>
        {pdfUrl ? (
          <iframe
            title={t("billing.contract.pdfTitle")}
            src={pdfUrl}
            style={{ width: "100%", height: 320, border: "none", display: "block" }}
          />
        ) : (
          <div style={{ height: 320, background: "#f1f5f9" }} />
        )}
      </div>

      <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
        {t("billing.contract.localizedTermsLabel")}
      </Typography.Text>
      <div
        style={{
          maxHeight: 220,
          overflowY: "auto",
          padding: "16px 18px",
          borderRadius: 12,
          border: "1px solid rgba(15,23,42,.08)",
          background: "#fff",
          marginBottom: 20,
        }}
      >
        {localizedClauses.map((c, i) => (
          <Typography.Paragraph key={i} style={{ marginBottom: 12, fontSize: 13, lineHeight: 1.65 }}>
            {c}
          </Typography.Paragraph>
        ))}
      </div>

      <Typography.Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
        {t("billing.contract.signatureLabel")}
      </Typography.Text>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 0, marginBottom: 8 }}>
        {t("billing.contract.signatureHint")}
      </Typography.Paragraph>

      <div
        ref={wrapRef}
        style={{
          borderRadius: 10,
          border: "2px dashed rgba(15,23,42,.2)",
          background: "#fafafa",
          marginBottom: 10,
          width: "100%",
        }}
      >
        <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: 168, touchAction: "none" }} />
      </div>
      <Flex justify="flex-end" style={{ marginBottom: 16 }}>
        <Button size="small" type="link" onClick={clearSignature}>
          {t("billing.contract.clearSignature")}
        </Button>
      </Flex>

      <Checkbox checked={readContract} onChange={(e) => setReadContract(e.target.checked)} style={{ marginBottom: 16 }}>
        <Typography.Text style={{ fontSize: 13 }}>{t("billing.contract.readCheckbox")}</Typography.Text>
      </Checkbox>

      <Button
        type="primary"
        size="large"
        block
        loading={submitting}
        disabled={!canContinue}
        onClick={() => void handleContinue()}
        style={{ height: 48, borderRadius: 10, fontWeight: 600 }}
      >
        {t("billing.contract.continueToPayment")}
      </Button>
    </div>
  );
}
