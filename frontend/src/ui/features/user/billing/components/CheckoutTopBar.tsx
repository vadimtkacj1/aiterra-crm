import { ArrowLeft, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface Props {
  onBack?: () => void;
}

export function CheckoutTopBar({ onBack }: Props) {
  const { t } = useTranslation();

  return (
    <div
      className="flex items-center gap-3 border-b border-(--ds-border-subtle) bg-(--ds-surface-0)"
      style={{ padding: "16px 24px" }}
    >
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="font-medium text-(--ds-text-secondary)">
          <ArrowLeft aria-hidden="true" className="rtl:rotate-180" />
          {t("common.back")}
        </Button>
      )}
      <span className="ms-auto flex items-center gap-1.5 text-[13px] text-(--ds-text-secondary)">
        <Lock aria-hidden="true" className="size-3.25" />
        {t("billing.secureCheckout")}
      </span>
    </div>
  );
}
