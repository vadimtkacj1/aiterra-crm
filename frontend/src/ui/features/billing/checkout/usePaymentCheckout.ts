import { App } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/app/AppProviders";
import type { PendingPaymentAction } from "@/services/billing/IBillingService";
import { accountPath } from "@/ui/navigation/paths";
import type { CheckoutLocationState } from "./checkoutTypes";

export function usePaymentCheckout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { accountId: accountIdParam } = useParams<{ accountId: string }>();
  const accountId = accountIdParam ?? "0";
  const { services } = useApp();
  const { message } = App.useApp();

  const state = location.state as CheckoutLocationState | null;

  const [payment, setPayment] = useState<PendingPaymentAction | null>(state?.payment ?? null);
  const [intent, setIntent] = useState<"savedCard" | "hosted">(state?.intent ?? "hosted");
  const [loadingPayment, setLoadingPayment] = useState(!state?.payment);

  const [checkoutPhase, setCheckoutPhase] = useState<"contract" | "payment">("contract");
  const [contractSubmitting, setContractSubmitting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  const goBack = useCallback(() => navigate(accountPath(accountId, "billing")), [navigate, accountId]);

  const handleTopBack = () => {
    if (checkoutPhase === "payment") {
      setCheckoutPhase("contract");
      return;
    }
    goBack();
  };

  useEffect(() => {
    if (state?.payment) return;
    setLoadingPayment(true);
    services.billing
      .fetchOverview(accountId)
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
  }, [accountId, state?.payment, services.billing, goBack]);

  const handleContractContinue = async (signatureDataUrl: string) => {
    if (!payment) return;
    setContractSubmitting(true);
    try {
      await services.billing.submitContractAcceptance(accountId, {
        paymentActionId: payment.id,
        signaturePngBase64: signatureDataUrl,
      });
      setCheckoutPhase("payment");
      void message.success(t("billing.contract.savedOk"));
    } catch (e) {
      void message.error(e instanceof Error ? e.message : t("billing.contract.savedFail"));
    } finally {
      setContractSubmitting(false);
    }
  };

  const handlePay = async () => {
    if (!payment) return;
    if (intent === "hosted") {
      if (!payment.payUrl) return;

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

      window.open(payment.payUrl, "_blank", "noopener,noreferrer");
      goBack();
    } else {
      setLoading(true);
      try {
        const res = await services.billing.payOpenInvoice(accountId);
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

  return {
    t,
    accountId,
    loadingPayment,
    payment,
    paid,
    checkoutPhase,
    contractSubmitting,
    loading,
    intent,
    setIntent,
    goBack,
    handleTopBack,
    handleContractContinue,
    handlePay,
  };
}
