import { BellOutlined, FileTextOutlined, SyncOutlined } from "@ant-design/icons";
import { App, Badge, Button, Divider, Flex, Popover, Spin, Tag, Typography, theme } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../../app/AppProviders";
import type { PendingPaymentAction } from "../../../services/interfaces/IBillingService";
import { appLocaleFromLanguage, billingShell, formatInvoiceMoney } from "../../features/billing/components/billingUtils";
import type { CheckoutLocationState } from "../../features/billing/pages/PaymentCheckoutPage";
import { accountPath } from "../../navigation/paths";

function checkoutIntent(p: PendingPaymentAction): "savedCard" | "hosted" | null {
  if (p.payWithSavedCardAvailable) return "savedCard";
  if (p.payUrl) return "hosted";
  return null;
}

export function UserNotificationCenter({ accountId }: { accountId: string }) {
  const { token } = theme.useToken();
  const { services } = useApp();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingPaymentAction[]>([]);

  const locale = appLocaleFromLanguage(i18n.language ?? "en");
  const isRtl = i18n.dir() === "rtl";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await services.billing.fetchOverview(accountId);
      setPending(data.pendingPayments ?? []);
    } catch {
      void message.error(t("layout.notifications.loadError"));
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [accountId, services, message, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void load();
  };

  const count = pending.length;
  const popWidth = 400;

  const flowLabelsEqual = useMemo(() => {
    if (pending.length <= 1) return true;
    const f0 = pending[0]?.flow;
    return pending.every((x) => x.flow === f0);
  }, [pending]);

  const lineItemsPopover = (p: PendingPaymentAction) => {
    const lines = p.lineItems ?? [];
    if (lines.length === 0) return null;
    return (
      <div style={{ maxWidth: 300 }}>
        <Typography.Text
          style={{
            display: "block",
            marginBottom: 8,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: token.colorTextTertiary,
          }}
        >
          {t("billing.invoiceLinesHeading")}
        </Typography.Text>
        {lines.map((li, idx) => (
          <Flex
            key={`${p.id}-li-${idx}`}
            justify="space-between"
            align="flex-start"
            gap={10}
            style={{
              padding: "6px 0",
              borderTop: idx > 0 ? `1px solid ${token.colorBorderSecondary}` : undefined,
            }}
          >
            <Typography.Text style={{ fontSize: 13, flex: 1, minWidth: 0, lineHeight: 1.45 }}>
              {li.label}
              {li.code ? (
                <Typography.Text type="secondary" style={{ marginInlineStart: 6, fontSize: 12, fontFamily: billingShell.mono }}>
                  ({li.code})
                </Typography.Text>
              ) : null}
            </Typography.Text>
            <Typography.Text
              style={{
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
                fontFamily: billingShell.mono,
              }}
            >
              {formatInvoiceMoney(li.amount, p.currency, locale)}
            </Typography.Text>
          </Flex>
        ))}
      </div>
    );
  };

  const goPay = (p: PendingPaymentAction) => {
    setOpen(false);
    const intent = checkoutIntent(p);
    if (intent) {
      const state: CheckoutLocationState = { payment: p, intent };
      navigate(`/a/${accountId}/billing/checkout`, { state });
    } else {
      navigate(accountPath(accountId, "billing"));
    }
  };

  const inner = (
    <div style={{ width: popWidth, maxWidth: "calc(100vw - 24px)" }}>
      <Flex vertical gap={0}>
        <div style={{ padding: "2px 2px 10px" }}>
          <Typography.Text strong style={{ fontSize: 15, display: "block", lineHeight: 1.35 }}>
            {t("layout.notifications.title")}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4, lineHeight: 1.45 }}>
            {t("layout.notifications.subtitle")}
          </Typography.Text>
        </div>

        {!loading && count > 0 ? <Divider style={{ margin: "0 0 12px" }} /> : null}

        {loading ? (
          <Flex justify="center" align="center" style={{ padding: "28px 16px" }}>
            <Spin size="small" />
          </Flex>
        ) : count === 0 ? (
          <Flex
            vertical
            align="center"
            gap={10}
            style={{
              padding: "24px 16px 20px",
              borderRadius: token.borderRadiusLG,
              background: token.colorFillQuaternary,
              border: `1px dashed ${token.colorBorderSecondary}`,
            }}
          >
            <BellOutlined style={{ fontSize: 28, color: token.colorTextQuaternary }} />
            <Typography.Text type="secondary" style={{ textAlign: "center", fontSize: 13, lineHeight: 1.45 }}>
              {t("layout.notifications.empty")}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ textAlign: "center", fontSize: 12, lineHeight: 1.45 }}>
              {t("layout.notifications.emptyHint")}
            </Typography.Text>
          </Flex>
        ) : (
          <Flex vertical gap={10} style={{ maxHeight: 400, overflowY: "auto", paddingInlineEnd: 4 }}>
            {pending.map((p) => {
              const lines = p.lineItems ?? [];
              const hasLines = lines.length > 0;
              const intent = checkoutIntent(p);
              const primaryIsPay = intent !== null;
              const isMonthly = p.flow === "monthly";
              const rowShell = isMonthly
                ? {
                    background: token.colorPrimaryBg,
                    border: `1px solid ${token.colorPrimaryBorder}`,
                    accent: token.colorPrimary,
                    iconColor: token.colorPrimary,
                    FlowIcon: SyncOutlined,
                  }
                : {
                    background: token.colorFillAlter,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    accent: token.colorInfo,
                    iconColor: token.colorInfo,
                    FlowIcon: FileTextOutlined,
                  };
              const FlowIcon = rowShell.FlowIcon;
              return (
                <div
                  key={p.id}
                  style={{
                    borderRadius: token.borderRadiusLG,
                    border: rowShell.border,
                    background: rowShell.background,
                    boxShadow: billingShell.shadow,
                    minWidth: 0,
                    padding: "12px 14px 14px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Flex justify="space-between" align="flex-start" gap={12}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Flex align="center" gap={8} wrap="wrap" style={{ marginBottom: 8 }}>
                          <Tag
                            style={{
                              margin: 0,
                              fontSize: 11,
                              lineHeight: "18px",
                              color: token.colorTextSecondary,
                              background: token.colorFillQuaternary,
                              border: `1px solid ${token.colorBorderSecondary}`,
                            }}
                          >
                            {t("layout.notifications.statusDue")}
                          </Tag>
                          {!flowLabelsEqual || pending.length === 1 ? (
                            <Tag
                              color={isMonthly ? "blue" : "default"}
                              style={{
                                margin: 0,
                                fontSize: 11,
                                lineHeight: "18px",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                fontWeight: 600,
                              }}
                            >
                              {isMonthly ? t("billing.flowMonthlyShort") : t("billing.flowOneTimeShort")}
                            </Tag>
                          ) : null}
                        </Flex>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <FlowIcon
                            style={{
                              fontSize: 16,
                              color: rowShell.iconColor,
                              marginTop: 3,
                              flexShrink: 0,
                            }}
                          />
                          <Typography.Paragraph
                            style={{
                              margin: 0,
                              fontSize: 13,
                              lineHeight: 1.5,
                              fontWeight: 500,
                              color: token.colorText,
                              wordBreak: "break-word",
                            }}
                          >
                            {p.summary}
                          </Typography.Paragraph>
                        </div>
                      </div>
                      <Typography.Text
                        strong
                        style={{
                          fontSize: 15,
                          lineHeight: 1.35,
                          fontVariantNumeric: "tabular-nums",
                          fontFamily: billingShell.mono,
                          color: token.colorText,
                          flexShrink: 0,
                          textAlign: "end",
                        }}
                      >
                        {formatInvoiceMoney(p.amount, p.currency, locale)}
                      </Typography.Text>
                    </Flex>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      <div style={{ minHeight: 1 }}>
                        {hasLines ? (
                          <Popover title={t("billing.invoiceLinesHeading")} content={lineItemsPopover(p)} trigger="click" placement="bottom">
                            <Button size="small" type="link" style={{ padding: 0, height: "auto", fontSize: 12 }}>
                              {t("billing.pendingLineItemsTrigger", { count: lines.length })}
                            </Button>
                          </Popover>
                        ) : null}
                      </div>
                      <Flex gap={8} wrap="wrap">
                        {primaryIsPay ? (
                          <Button
                            size="small"
                            type="default"
                            onClick={() => {
                              setOpen(false);
                              navigate(accountPath(accountId, "billing"));
                            }}
                          >
                            {t("layout.notifications.openBilling")}
                          </Button>
                        ) : null}
                        <Button
                          type="primary"
                          size="small"
                          style={{ fontWeight: 600, borderRadius: token.borderRadius }}
                          onClick={() => goPay(p)}
                        >
                          {primaryIsPay ? t("billing.payNow") : t("layout.notifications.openBilling")}
                        </Button>
                      </Flex>
                    </div>
                  </div>
                </div>
              );
            })}
          </Flex>
        )}

      </Flex>
    </div>
  );

  return (
    <Popover
      content={inner}
      trigger="click"
      placement={isRtl ? "bottomLeft" : "bottomRight"}
      open={open}
      onOpenChange={onOpenChange}
      styles={{ content: { padding: "12px 14px 14px" } }}
    >
      <Badge count={loading ? 0 : count} size="small" offset={isRtl ? [-2, 2] : [2, 2]} color={token.colorWarning}>
        <Button
          type="text"
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          aria-label={t("layout.notifications.tooltip")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            borderRadius: token.borderRadiusLG,
            color: count > 0 && !loading ? token.colorText : token.colorTextSecondary,
          }}
        />
      </Badge>
    </Popover>
  );
}
