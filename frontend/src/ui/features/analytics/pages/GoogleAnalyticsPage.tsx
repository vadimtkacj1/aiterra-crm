import { Skeleton } from "antd";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../../../../app/AppProviders";
import { useAccountLayoutOutlet } from "../../../layouts/accountLayoutContext";
import { accountPath, Paths } from "../../../navigation/paths";
import { UserContentLayout } from "../../../shared/components/UserContentLayout";
import { CampaignAnalyticsPanel } from "../components/CampaignAnalyticsPanel";

export function GoogleAnalyticsPage() {
  const { services } = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { accountId } = useParams<{ accountId: string }>();
  const { accountLoading, currentAccount } = useAccountLayoutOutlet();
  const load = useCallback(() => services.googleAnalytics.fetchSnapshot(accountId ?? "0"), [services, accountId]);

  useEffect(() => {
    if (accountLoading || !accountId) return;
    if (!currentAccount) {
      navigate(Paths.accounts, { replace: true });
      return;
    }
    if (!currentAccount.hasGoogle) {
      navigate(accountPath(accountId, "billing"), { replace: true });
    }
  }, [accountLoading, currentAccount, accountId, navigate]);

  if (accountLoading) {
    return (
      <UserContentLayout>
        <Skeleton active title paragraph={{ rows: 2 }} />
      </UserContentLayout>
    );
  }

  if (!currentAccount?.hasGoogle) {
    return null;
  }

  return (
    <UserContentLayout>
      <CampaignAnalyticsPanel
        title={t("analytics.google.title")}
        description={t("analytics.google.description")}
        load={load}
      />
    </UserContentLayout>
  );
}
