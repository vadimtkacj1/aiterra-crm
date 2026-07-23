import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import type { CheckoutLocationState } from "../checkout/checkoutTypes";
import type { MetaAccountBilling } from "@/domain/CampaignAnalytics";
import type { BillingOverview, PendingPaymentAction, UserBillingHistoryRow } from "@/services/billing/IBillingService";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { message } from "@/lib/toast";
import { useApp } from "@/app/AppProviders";
import { useAccountLayoutOutlet } from "@/ui/layouts/accountLayoutContext";
import { PageHeader } from "@/ui/shared/components/PageHeader";
import { UserContentLayout } from "@/ui/shared/components/UserContentLayout";
import { BillingHistorySection } from "../components/BillingHistorySection";
import { MetaBillingCard } from "../components/MetaBillingCard";
import { PaymentsSection } from "../components/PaymentsSection";
import { PendingInvoicePanel } from "../components/PendingInvoicePanel";
import { appLocaleFromLanguage } from "../components/billingUtils";

export function BillingPage() {
  const { t, i18n } = useTranslation();
  const { services, isAdmin } = useApp();
  const navigate = useNavigate();
  const tRef = useRef(t);
  tRef.current = t;
  const { currentAccount } = useAccountLayoutOutlet();
  const { accountId } = useParams<{ accountId: string }>();
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [billingHistory, setBillingHistory] = useState<UserBillingHistoryRow[]>([]);
  const [metaBilling, setMetaBilling] = useState<MetaAccountBilling | null>(null);
  const appLocale = appLocaleFromLanguage(i18n.language ?? "en");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await services.billing.fetchOverview(accountId ?? "0");
      setOverview(data);
    } catch (e) {
      message.error(e instanceof Error ? e.message : tRef.current("billing.loadError"));
    } finally {
      setLoading(false);
    }
  }, [services, accountId]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      if (isAdmin) {
        const data = await services.admin.listAccountBillingHistory(parseInt(accountId ?? "0"));
        setBillingHistory(data);
      } else {
        const data = await services.billing.fetchBillingHistory(accountId ?? "0");
        setBillingHistory(data);
      }
    } catch {
      setBillingHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [services, accountId, isAdmin]);

  const loadMetaBilling = useCallback(async () => {
    setMetaLoading(true);
    try {
      const data = await services.metaAnalytics.fetchMetaBilling(accountId ?? "0");
      setMetaBilling(data);
    } catch {
      setMetaBilling(null);
    } finally {
      setMetaLoading(false);
    }
  }, [services, accountId]);

  useEffect(() => {
    if (!isAdmin) void load();
    void loadHistory();
    void loadMetaBilling();
  }, [load, loadHistory, loadMetaBilling, isAdmin]);

  const goToCheckout = (payment: PendingPaymentAction, intent: "savedCard" | "hosted") => {
    const state: CheckoutLocationState = { payment, intent };
    navigate(`/a/${accountId ?? "0"}/billing/checkout`, { state });
  };

  const reloadAll = () => {
    if (!isAdmin) void load();
    void loadHistory();
    void loadMetaBilling();
  };

  const reloading = (isAdmin ? false : loading) || metaLoading;

  return (
    <UserContentLayout>
      <PageHeader
        title={t("billing.title")}
        subtitle={isAdmin ? undefined : t("billing.subtitle")}
        extra={
          <Button variant="outline" onClick={reloadAll} disabled={reloading}>
            {reloading ? (
              <Spinner size="sm" className="text-current" aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            {t("common.reload")}
          </Button>
        }
      />
      <div className="flex flex-col gap-6">
        {!isAdmin && currentAccount && !currentAccount.hasMeta ? (
          <Alert
            variant="info"
            title={t("billing.noMetaBannerTitle")}
            description={t("billing.noMetaBannerDesc")}
          />
        ) : null}

        {!isAdmin && !loading && overview?.pendingPayments && overview.pendingPayments.length > 0 ? (
          <Card className="rounded-xl border-(--ds-border-subtle) shadow-(--ds-shadow-card)">
            <div className="flex min-h-11 items-center border-b border-(--ds-border-subtle) px-4 pb-2.5 pt-3">
              <span className="text-[15px] font-semibold tracking-[-0.01em]">
                {t("billing.pendingPaymentsTitle")}
              </span>
            </div>
            <div className="flex flex-col gap-2.5 px-4 py-4">
              {overview.pendingPayments.map((p, idx) => (
                <PendingInvoicePanel
                  key={`${p.id}-${idx}`}
                  payment={p}
                  onRefresh={() => void load()}
                  onCheckout={(intent) => goToCheckout(p, intent)}
                />
              ))}
            </div>
          </Card>
        ) : null}

        <MetaBillingCard metaBilling={metaBilling} metaLoading={metaLoading} appLocale={appLocale} />

        {!isAdmin && (
          loading
            ? (
              <div className="space-y-3 py-4">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
            )
            : <PaymentsSection
                overview={overview}
                loading={loading}
                appLocale={appLocale}
                accountId={accountId ?? "0"}
              />
        )}

        <BillingHistorySection
          rows={billingHistory}
          loading={historyLoading}
          appLocale={appLocale}
          accountId={accountId ?? "0"}
        />
      </div>
    </UserContentLayout>
  );
}
