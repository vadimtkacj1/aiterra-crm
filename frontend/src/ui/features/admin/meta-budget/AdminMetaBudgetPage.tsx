import { ReloadOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";
import { MetaPaymentPanel } from "./MetaPaymentPanel";

export function AdminMetaBudgetPage() {
  const { t } = useTranslation();
  const [refreshToken, setRefreshToken] = useState(0);
  const [loading, setLoading] = useState(true);

  return (
    <PageContainer>
      <PageHeader
        title={t("admin.topup.title")}
        subtitle={t("admin.topup.subtitle")}
        actions={
          <Tooltip title={t("common.reload")}>
            <Button
              aria-label={t("common.reload")}
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={() => setRefreshToken((x) => x + 1)}
            />
          </Tooltip>
        }
      />
      <MetaPaymentPanel refreshToken={refreshToken} onLoadingChange={setLoading} />
    </PageContainer>
  );
}
