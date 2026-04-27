import { App, Spin } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { PendingPaymentAction } from "../../../../services/interfaces/IBillingService";
import { useApp } from "../../../../app/AppProviders";
import { accountPath } from "../../../navigation/paths";
import { downloadInvoicePdf } from "../../../shared/utils/invoicePdf";
import { CheckoutInvoiceSummary } from "../components/CheckoutInvoiceSummary";
import { CheckoutPaymentPanel } from "../components/CheckoutPaymentPanel";
import { CheckoutTopBar } from "../components/CheckoutTopBar";

export interface CheckoutLocationState {
  payment: PendingPaymentAction;
  intent: "savedCard" | "hosted";
}

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

export function PaymentCheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { accountId } = useParams<{ accountId: string }>();
  const { services } = useApp();
  const { message } = App.useApp();

  const state = location.state as CheckoutLocationState | null;

  const [payment, setPayment] = useState<PendingPaymentAction | null>(state?.payment ?? null);
  const [intent, setIntent] = useState<"savedCard" | "hosted">(state?.intent ?? "hosted");
  const [loadingPayment, setLoadingPayment] = useState(!state?.payment);

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  const goBack = () => navigate(accountPath(accountId ?? "0", "billing"));

  useEffect(() => {
    if (state?.payment) return;
    setLoadingPayment(true);
    services.billing
      .fetchOverview(accountId ?? "0")
      .then((data) => {
        const first = data.pendingPayments?.[0] ?? null;
        if (first) {
          setPayment(first);
          setIntent("hosted");
        } else {
          goBack();
        }
      })
      .catch(() => goBack())
      .finally(() => setLoadingPayment(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  if (loadingPayment) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!payment) return null;

  const total = formatMoney(payment.amount, payment.currency);

  const handlePay = async () => {
    if (!agreed) return;
    if (intent === "hosted") {
      if (!payment.payUrl) return;

      // Mock mode — confirm inline without opening a new tab
      if (payment.payUrl.includes("/api/mock-payment/")) {
        setLoading(true);
        try {
          const confirmUrl = payment.payUrl.replace(/\/$/, "") + "/confirm";
          const res = await fetch(confirmUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ success: true }),
          });
          const data = (await res.json()) as { ok?: boolean };
          if (res.ok && data.ok) {
            setPaid(true);
          } else {
            void message.error(t("errors.generic"));
          }
        } catch {
          void message.error(t("errors.generic"));
        } finally {
          setLoading(false);
        }
        return;
      }

      downloadInvoicePdf({
        invoiceId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: "pending_payment",
        description: payment.summary,
        chargeType: payment.flow,
        accountId: accountId ?? "0",
        lineItems: payment.lineItems ?? undefined,
        note: "Generated at checkout start. Final paid status is confirmed by webhook.",
      });
      window.open(payment.payUrl, "_blank", "noopener,noreferrer");
      goBack();
    } else {
      setLoading(true);
      try {
        const res = await services.billing.payOpenInvoice(accountId ?? "0");
        downloadInvoicePdf({
          invoiceId: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: res.status,
          description: payment.summary,
          chargeType: payment.flow,
          accountId: accountId ?? "0",
          lineItems: payment.lineItems ?? undefined,
        });
        if (res.status === "paid") {
          void message.success(t("billing.payWithCardSuccess"));
        } else {
          void message.warning(t("billing.payWithCardStatus", { status: res.status }));
        }
        goBack();
      } catch (e) {
        void message.error(e instanceof Error ? e.message : t("errors.generic"));
      } finally {
        setLoading(false);
      }
    }
  };

  if (paid) {
    return (
      <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", flexDirection: "column" }}>
        <CheckoutTopBar onBack={goBack} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid rgba(15,23,42,.09)",
              boxShadow: "0 2px 12px rgba(15,23,42,.06)",
              padding: "48px 40px",
              maxWidth: 440,
              width: "100%",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 16 }}>✓</div>
            <p style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px", color: "#0f172a" }}>
              {t("billing.paymentSuccessTitle")}
            </p>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 28px" }}>
              {t("billing.paymentSuccessDesc")}
            </p>
            <button
              onClick={goBack}
              style={{
                background: "#1677ff",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "12px 28px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              {t("billing.paymentSuccessBack")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", flexDirection: "column" }}>
      <CheckoutTopBar onBack={goBack} />

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "48px 24px 64px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 880, display: "flex", gap: 32, flexWrap: "wrap" }}>
          <CheckoutInvoiceSummary payment={payment} />
          <CheckoutPaymentPanel
            total={total}
            intent={intent}
            agreed={agreed}
            loading={loading}
            onAgreeChange={setAgreed}
            onPay={() => void handlePay()}
          />
        </div>
      </div>
    </div>
  );
}
