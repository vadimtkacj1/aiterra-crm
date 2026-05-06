import { Button, Result, Spin } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
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
        <Spin size="large" />
      </div>
    );
  }

  if (!c.payment) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Result
          status="info"
          title={c.t("billing.checkoutMissingPaymentTitle")}
          subTitle={c.t("billing.checkoutMissingPaymentDesc")}
          extra={
            <Button type="primary" onClick={c.goBack}>
              {c.t("billing.paymentSuccessBack")}
            </Button>
          }
        />
      </div>
    );
  }

  const total = formatInvoiceMoney(c.payment.amount, c.payment.currency, appLocale);

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", flexDirection: "column" }}>
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
