import { Spin, Steps } from "antd";
import { useTranslation } from "react-i18next";
import { appLocaleFromLanguage, formatInvoiceMoney } from "../components/billingUtils";
import { CheckoutContractStep } from "../components/CheckoutContractStep";
import { CheckoutInvoiceSummary } from "../components/CheckoutInvoiceSummary";
import { CheckoutPaymentPanel } from "../components/CheckoutPaymentPanel";
import { CheckoutTopBar } from "../components/CheckoutTopBar";
import { CheckoutSuccessScreen } from "./CheckoutSuccessScreen";
import { usePaymentCheckout } from "./usePaymentCheckout";

export type { CheckoutLocationState } from "./checkoutTypes";

export function PaymentCheckoutPage() {
  const { i18n } = useTranslation();
  const c = usePaymentCheckout();
  const appLocale = appLocaleFromLanguage(i18n.language ?? "en");

  if (c.loadingPayment) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!c.payment) return null;

  if (c.paid) {
    return <CheckoutSuccessScreen t={c.t} onBack={c.goBack} />;
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
          <Steps
            size="small"
            current={c.checkoutPhase === "contract" ? 0 : 1}
            style={{ maxWidth: 520, margin: "0 auto 28px" }}
            items={[
              { title: c.t("billing.contract.stepWizardSign") },
              { title: c.t("billing.contract.stepWizardPay") },
            ]}
          />

          {c.checkoutPhase === "contract" ? (
            <CheckoutContractStep
              payment={c.payment}
              accountId={c.accountId}
              appLocale={appLocale}
              submitting={c.contractSubmitting}
              onContinue={c.handleContractContinue}
            />
          ) : (
            <div style={{ display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
              <CheckoutInvoiceSummary payment={c.payment} />
              <CheckoutPaymentPanel
                total={total}
                intent={c.intent}
                loading={c.loading}
                onPay={() => void c.handlePay()}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
