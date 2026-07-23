import { Info } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { appLocaleFromLanguage, formatInvoiceMoney } from "../components/billingUtils";
import { CheckoutInvoiceSummary } from "../components/CheckoutInvoiceSummary";
import { CheckoutPaymentPanel } from "../components/CheckoutPaymentPanel";
import { CheckoutTopBar } from "../components/CheckoutTopBar";
import { usePaymentCheckout } from "./usePaymentCheckout";
import { Paths } from "@/ui/navigation/paths";

export type { CheckoutLocationState } from "./checkoutTypes";

export function PaymentCheckoutPage() {
  const { i18n } = useTranslation();
  const c = usePaymentCheckout();
  const appLocale = appLocaleFromLanguage(i18n.language ?? "en");
  const [consentChecked, setConsentChecked] = useState(false);

  if (c.loadingPayment) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!c.payment) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <Info aria-hidden="true" className="size-16 text-(--ds-color-info)" strokeWidth={1.25} />
          <h2 className="m-0 text-2xl font-semibold">{c.t("billing.checkoutMissingPaymentTitle")}</h2>
          <p className="m-0 text-sm text-muted-foreground">{c.t("billing.checkoutMissingPaymentDesc")}</p>
          <Button className="mt-2" onClick={c.goBack}>
            {c.t("billing.paymentSuccessBack")}
          </Button>
        </div>
      </div>
    );
  }

  const total = formatInvoiceMoney(c.payment.amount, c.payment.currency, appLocale);

  return (
    <div style={{ minHeight: "100vh", background: "var(--ds-surface-1)", display: "flex", flexDirection: "column" }}>
      <CheckoutTopBar onBack={c.handleTopBack} />

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "48px 24px 64px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 920 }}>
          <div style={{ display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
            <CheckoutInvoiceSummary payment={c.payment} />
            <CheckoutPaymentPanel
              total={total}
              intent={c.intent}
              loading={c.loading}
              consentChecked={consentChecked}
              onConsentChange={setConsentChecked}
              termsUrl={Paths.terms}
              privacyUrl={Paths.privacyPolicy}
              cancelUrl={Paths.cancelPolicy}
              onPay={() => void c.handlePay()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
