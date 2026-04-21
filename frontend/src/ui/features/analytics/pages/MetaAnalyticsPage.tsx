import { Skeleton, Typography } from "antd";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../../../../app/AppProviders";
import { useAccountLayoutOutlet } from "../../../layouts/accountLayoutContext";
import { accountPath, Paths } from "../../../navigation/paths";
import { UserContentLayout } from "../../../shared/components/UserContentLayout";
import { MetaCampaignListPanel } from "../components/MetaCampaignListPanel";

export function MetaAnalyticsPage() {
  const { services } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId: string }>();
  const { accountLoading, currentAccount } = useAccountLayoutOutlet();

  useEffect(() => {
    if (accountLoading || !accountId) return;
    if (!currentAccount) {
      navigate(Paths.accounts, { replace: true });
      return;
    }
    if (!currentAccount.hasMeta) {
      navigate(accountPath(accountId, "billing"), { replace: true });
    }
  }, [accountLoading, currentAccount, accountId, navigate]);

  const load = useCallback(
    (since?: string, until?: string) => services.metaAnalytics.fetchSnapshot(accountId ?? "0", since, until),
    [services, accountId],
  );

  if (accountLoading) {
    return (
      <UserContentLayout>
        <Skeleton active title paragraph={{ rows: 2 }} />
      </UserContentLayout>
    );
  }

  if (!currentAccount?.hasMeta) {
    return null;
  }

  return (
    <UserContentLayout>
      <Typography.Title level={4} style={{ margin: "0 0 16px" }}>
        {t("analytics.meta.title")}
      </Typography.Title>
      <MetaCampaignListPanel load={load} />
    </UserContentLayout>
  );
}

