import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/app/AppProviders";
import { useAccountLayoutOutlet } from "@/ui/layouts/accountLayoutContext";
import { accountPath, Paths } from "@/ui/navigation/paths";
import { UserContentLayout } from "@/ui/shared/components/UserContentLayout";
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
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
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
