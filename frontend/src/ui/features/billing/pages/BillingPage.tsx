import { FileTextOutlined, ReloadOutlined } from "@ant-design/icons";
import { App, Alert, Button, Card, Flex, Space } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import type { CheckoutLocationState } from "./PaymentCheckoutPage";
import type { MetaAccountBilling } from "../../../../domain/CampaignAnalytics";
import type { BillingOverview, PendingPaymentAction } from "../../../../services/interfaces/IBillingService";
import { useApp } from "../../../../app/AppProviders";
import { useAccountLayoutOutlet } from "../../../layouts/accountLayoutContext";
import { PageHeader } from "../../../shared/components/PageHeader";
import { UserContentLayout } from "../../../shared/components/UserContentLayout";
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
  const [overview, setOverview] = useState<BillingOverview | null>(null);
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
    void loadMetaBilling();
  }, [load, loadMetaBilling, isAdmin]);

  const goToCheckout = (payment: PendingPaymentAction, intent: "savedCard" | "hosted") => {
    const state: CheckoutLocationState = { payment, intent };
    navigate(`/a/${accountId ?? "0"}/billing/checkout`, { state });
  };

  const reloadAll = () => {
    if (!isAdmin) void load();
    void loadMetaBilling();
  };

  return (
    <UserContentLayout>
      <Flex vertical gap={20}>
        <PageHeader
          title={t("billing.title")}
          subtitle={isAdmin ? undefined : t("billing.subtitle")}
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={reloadAll}
              loading={(isAdmin ? false : loading) || metaLoading}
              style={{ borderRadius: billingShell.radius, fontWeight: 500 }}
            >
              {t("common.reload")}
            </Button>
          }
        />

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
              <Space align="center" size={10}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: billingShell.radius,
                    background: billingShell.fillMuted,
                    border: `1px solid ${billingShell.borderInner}`,
                    color: "var(--ant-color-text-secondary)",
                  }}
                >
                  <FileTextOutlined style={{ fontSize: 16 }} />
                </span>
                <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>
                  {t("billing.pendingPaymentsTitle")}
                </span>
              </Space>
            }
            size="small"
            variant="borderless"
            styles={{
              header: { borderBottom: `1px solid ${billingShell.borderInner}`, paddingBottom: 10, minHeight: 44 },
              body: { paddingTop: 12, paddingBottom: 12 },
            }}
            style={{
              borderRadius: billingShell.radiusMd,
              boxShadow: billingShell.shadow,
              border: `1px solid ${billingShell.border}`,
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
          <PaymentsSection overview={overview} loading={loading} appLocale={appLocale} />
        )}
      </Flex>
    </UserContentLayout>
  );
}
