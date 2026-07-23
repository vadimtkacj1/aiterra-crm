import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/app/AppProviders";
import { message } from "@/lib/toast";
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

  const state = location.state as CheckoutLocationState | null;

  const [payment, setPayment] = useState<PendingPaymentAction | null>(state?.payment ?? null);
  const [intent, setIntent] = useState<"savedCard" | "hosted">(state?.intent ?? "hosted");
  const [loadingPayment, setLoadingPayment] = useState(!state?.payment);

  const [loading, setLoading] = useState(false);

  const goBack = useCallback(() => navigate(accountPath(accountId, "billing")), [navigate, accountId]);

  const handleTopBack = () => goBack();

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

  const handlePay = async () => {
    if (!payment) return;
    if (intent === "hosted") {
      setLoading(true);
      try {
        const res = await services.billing.createHostedCheckout({
          accountId: Number(accountId),
          amount: payment.amount,
          currency: payment.currency || "ILS",
          description: payment.summary || "Invoice payment",
        });
        const payUrl = (res.paymentUrl || "").trim();
        if (!payUrl) {
          void message.warning(t("billing.paymentLinkPending"));
          return;
        }
        window.location.assign(payUrl);
        return;
      } catch (e) {
        void message.error(e instanceof Error ? e.message : t("errors.generic"));
      } finally {
        setLoading(false);
      }
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
    loading,
    intent,
    setIntent,
    goBack,
    handleTopBack,
    handlePay,
  };
}
