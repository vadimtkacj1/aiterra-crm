import { CircleCheck, CreditCard, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { tokens } from "@/styles/designSystem";

interface Props {
  total: string;
  intent: "savedCard" | "hosted";
  loading: boolean;
  consentChecked: boolean;
  onConsentChange: (checked: boolean) => void;
  termsUrl: string;
  privacyUrl: string;
  cancelUrl: string;
  onPay: () => void;
}

export function CheckoutPaymentPanel({
  total,
  intent,
  loading,
  consentChecked,
  onConsentChange,
  termsUrl,
  privacyUrl,
  cancelUrl,
  onPay,
}: Props) {
  const { t } = useTranslation();
  const IntentIcon = intent === "savedCard" ? CreditCard : Wallet;

  return (
    <div
      className="flex flex-col gap-5 bg-(--ds-surface-0)"
      style={{
        flex: "0 0 340px",
        minWidth: 300,
        borderRadius: tokens.radius.lg,
        border: "1px solid var(--ds-border-subtle)",
        boxShadow: tokens.shadow.md,
        padding: "28px 28px 24px",
      }}
    >
      <div>
        <span className="mb-1 block text-xs text-muted-foreground">{t("billing.invoiceTotal")}</span>
        <h2 className="m-0 text-[32px] font-bold tracking-[-0.03em] tabular-nums">{total}</h2>
      </div>

      <Separator />

      <div
        className="flex items-center gap-2.5 rounded-md border border-(--ds-border-subtle) bg-(--ds-surface-1)"
        style={{ padding: "12px 14px" }}
      >
        <IntentIcon aria-hidden="true" className="size-4.5 shrink-0 text-(--ds-text-secondary)" />
        <div>
          <span className="block text-[13px] font-semibold">
            {intent === "savedCard" ? t("billing.payWithSavedCard") : t("billing.payNow")}
          </span>
          <span className="text-xs text-muted-foreground">
            {intent === "savedCard" ? t("billing.checkoutSavedCardNote") : t("billing.checkoutHostedNote")}
          </span>
        </div>
      </div>

      <p className="m-0 text-xs leading-[1.55] text-muted-foreground">{t("billing.checkoutPayNote")}</p>

      <div className="flex flex-col gap-2.5">
        <label className="flex cursor-pointer items-start gap-2">
          <Checkbox
            checked={consentChecked}
            onCheckedChange={(checked) => onConsentChange(checked === true)}
            className="mt-0.5"
          />
          <span className="text-[13px]">
            {intent === "savedCard" ? t("billing.checkoutConsentSaved") : t("billing.checkoutConsentHosted")}
          </span>
        </label>
        <span className="text-xs leading-normal text-muted-foreground">
          {t("billing.checkoutLegal")}{" "}
          <a href={termsUrl} target="_blank" rel="noreferrer" className="text-(--ds-text-link) hover:underline">
            {t("billing.checkoutTermsLink")}
          </a>{" "}
          {t("billing.checkoutAnd")}{" "}
          <a href={privacyUrl} target="_blank" rel="noreferrer" className="text-(--ds-text-link) hover:underline">
            {t("billing.checkoutPrivacyPolicyLink")}
          </a>{" "}
          {t("billing.checkoutAnd")}{" "}
          <a href={cancelUrl} target="_blank" rel="noreferrer" className="text-(--ds-text-link) hover:underline">
            {t("billing.checkoutCancelPolicyLink")}
          </a>
          .
        </span>
      </div>

      <Button
        size="lg"
        disabled={!consentChecked || loading}
        onClick={onPay}
        className="h-12 text-[15px] font-semibold shadow-none"
      >
        {loading ? (
          <Spinner size="sm" className="text-current" aria-hidden="true" />
        ) : (
          <IntentIcon aria-hidden="true" />
        )}
        {intent === "savedCard" ? t("billing.payWithSavedCard") : t("billing.payNow")}
      </Button>

      <div className="flex items-center justify-center gap-1.5">
        <CircleCheck aria-hidden="true" className="size-3.25" style={{ color: "var(--ds-color-success)" }} />
        <span className="text-xs text-muted-foreground">{t("billing.invoiceSecureNote")}</span>
      </div>
    </div>
  );
}
