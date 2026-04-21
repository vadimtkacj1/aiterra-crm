import { App } from "antd";
import { useState } from "react";
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
  const payment = state?.payment;
  const intent = state?.intent ?? "hosted";

  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const goBack = () => navigate(accountPath(accountId ?? "0", "billing"));

  if (!payment) {
    goBack();
    return null;
  }

  const total = formatMoney(payment.amount, payment.currency);

  const handlePay = async () => {
    if (!agreed) return;
    if (intent === "hosted") {
      if (!payment.payUrl) return;
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
