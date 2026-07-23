import { useTranslation } from "react-i18next";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";
import { MetaPaymentPanel } from "./MetaPaymentPanel";

export function AdminMetaBudgetPage() {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <PageHeader
        title={t("admin.topup.title")}
        subtitle={t("admin.topup.subtitle")}
      />
      <MetaPaymentPanel />
    </PageContainer>
  );
}
