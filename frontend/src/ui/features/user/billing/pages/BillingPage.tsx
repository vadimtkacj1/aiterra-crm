import { ReloadOutlined } from "@ant-design/icons";
import { App, Alert, Button, Card, Flex, Skeleton } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import type { CheckoutLocationState } from "../checkout/checkoutTypes";
import type { MetaAccountBilling } from "@/domain/CampaignAnalytics";
import type { BillingOverview, PendingPaymentAction, UserBillingHistoryRow } from "@/services/billing/IBillingService";
import { useApp } from "@/app/AppProviders";
import { useAccountLayoutOutlet } from "@/ui/layouts/accountLayoutContext";
import { PageHeader } from "@/ui/shared/components/PageHeader";
import { UserContentLayout } from "@/ui/shared/components/UserContentLayout";
import { BillingHistorySection } from "../components/BillingHistorySection";
import { MetaBillingCard } from "../components/MetaBillingCard";
import { PaymentsSection } from "../components/PaymentsSection";
import { PendingInvoicePanel } from "../components/PendingInvoicePanel";
import { appLocaleFromLanguage, billingShell } from "../components/billingUtils";

export function BillingPage() {
  const { t, i18n } = useTranslation();
  const { services, isAdmin } = useApp();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const messageRef = useRef(message);
  messageRef.current = message;
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
      messageRef.current.error(e instanceof Error ? e.message : tRef.current("billing.loadError"));
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

  return (
    <UserContentLayout>
      <PageHeader
        title={t("billing.title")}
        subtitle={isAdmin ? undefined : t("billing.subtitle")}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={reloadAll}
            loading={(isAdmin ? false : loading) || metaLoading}
          >
            {t("common.reload")}
          </Button>
        }
      />
      <Flex vertical gap={24}>
        {!isAdmin && currentAccount && !currentAccount.hasMeta ? (
          <Alert
            type="info"
            showIcon
            message={t("billing.noMetaBannerTitle")}
            description={t("billing.noMetaBannerDesc")}
          />
        ) : null}

        {!isAdmin && !loading && overview?.pendingPayments && overview.pendingPayments.length > 0 ? (
          <Card
            title={
              <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>
                {t("billing.pendingPaymentsTitle")}
              </span>
            }
            size="small"
            variant="borderless"
            styles={{
              header: { borderBottom: `1px solid ${billingShell.borderInner}`, paddingBottom: 10, minHeight: 44 },
              body: { paddingTop: 16, paddingBottom: 16 },
            }}
            style={{
              borderRadius: billingShell.radiusMd,
              boxShadow: billingShell.shadow,
              border: `1px solid ${billingShell.borderInner}`,
            }}
          >
            <Flex vertical gap={10}>
              {overview.pendingPayments.map((p, idx) => (
                <PendingInvoicePanel
                  key={`${p.id}-${idx}`}
                  payment={p}
                  onRefresh={() => void load()}
                  onCheckout={(intent) => goToCheckout(p, intent)}
                />
              ))}
            </Flex>
          </Card>
        ) : null}

        <MetaBillingCard metaBilling={metaBilling} metaLoading={metaLoading} appLocale={appLocale} />

        {!isAdmin && (
          loading
            ? <Skeleton active paragraph={{ rows: 4 }} style={{ padding: "16px 0" }} />
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
      </Flex>
    </UserContentLayout>
  );
}
