import { ChartLine } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApp } from "@/app/AppProviders";
import { useAccountLayoutOutlet } from "@/ui/layouts/accountLayoutContext";
import { accountPath, Paths } from "@/ui/navigation/paths";
import { EmptyState } from "@/ui/shared/components/EmptyState";
import { PageHeader } from "@/ui/shared/components/PageHeader";
import { UserContentLayout } from "@/ui/shared/components/UserContentLayout";
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
    }
  }, [accountLoading, currentAccount, accountId, navigate]);

  const load = useCallback(
    (since?: string, until?: string) => services.metaAnalytics.fetchSnapshot(accountId ?? "0", since, until),
    [services, accountId],
  );

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

  if (!currentAccount?.hasMeta) {
    return (
      <UserContentLayout>
        <PageHeader title={t("analytics.meta.title")} subtitle={t("analytics.meta.subtitle")} />
        <Card>
          <EmptyState
            icon={<ChartLine aria-hidden="true" className="size-16 text-(--ds-text-disabled)" strokeWidth={1.25} />}
            title={t("analytics.meta.notLinkedTitle")}
            description={t("analytics.meta.notLinkedDescription")}
            action={{
              label: t("analytics.meta.goToBilling"),
              onClick: () => accountId && navigate(accountPath(accountId, "billing")),
            }}
          />
        </Card>
      </UserContentLayout>
    );
  }

  return (
    <UserContentLayout>
      <PageHeader title={t("analytics.meta.title")} subtitle={t("analytics.meta.subtitle")} />
      <MetaCampaignListPanel load={load} />
    </UserContentLayout>
  );
}
