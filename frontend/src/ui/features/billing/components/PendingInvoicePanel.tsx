import { FileTextOutlined, LoadingOutlined, ReloadOutlined, SyncOutlined, WalletOutlined } from "@ant-design/icons";
import { Button, Flex, Popover, Typography, theme } from "antd";
import { useTranslation } from "react-i18next";
import type { PendingPaymentAction } from "../../../../services/interfaces/IBillingService";
import { appLocaleFromLanguage, billingShell, formatInvoiceMoney } from "./billingUtils";

interface Props {
  payment: PendingPaymentAction;
  onRefresh?: () => void;
  onCheckout: (intent: "savedCard" | "hosted") => void;
}

export function PendingInvoicePanel({ payment, onRefresh, onCheckout }: Props) {
  const { t, i18n } = useTranslation();
  const { token } = theme.useToken();
  const locale = appLocaleFromLanguage(i18n.language ?? "en");
  const isMonthly = payment.flow === "monthly";
  const lines = payment.lineItems ?? [];
  const hasLines = lines.length > 0;

  const shell = isMonthly
    ? {
        background: token.colorPrimaryBg,
        border: `1px solid ${token.colorPrimaryBorder}`,
        accent: token.colorPrimary,
        iconBg: token.colorPrimaryBg,
        iconBorder: `1px solid ${token.colorPrimaryBorder}`,
        iconColor: token.colorPrimary,
        FlowIcon: SyncOutlined,
      }
    : {
        background: token.colorFillAlter,
        border: `1px solid ${token.colorBorderSecondary}`,
        accent: token.colorInfo,
        iconBg: token.colorFillTertiary,
        iconBorder: `1px solid ${token.colorBorderSecondary}`,
        iconColor: token.colorInfo,
        FlowIcon: FileTextOutlined,
      };

  const lineItemsPopover = hasLines ? (
    <div style={{ minWidth: 260, maxWidth: 340 }}>
      <Typography.Text
        style={{
          display: "block",
          marginBottom: 10,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: token.colorTextTertiary,
        }}
      >
        {t("billing.invoiceLinesHeading")}
      </Typography.Text>
      {lines.map((li, idx) => (
        <Flex
          key={`${payment.id}-li-${idx}`}
          justify="space-between"
          align="center"
          gap={16}
          style={{
            padding: "7px 0",
            borderTop: idx > 0 ? `1px solid ${token.colorBorderSecondary}` : undefined,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <Typography.Text style={{ fontSize: 13 }} ellipsis>
              {li.label}
            </Typography.Text>
            {li.code ? (
              <Typography.Text
                type="secondary"
                style={{ display: "block", fontSize: 11, fontFamily: billingShell.mono, marginTop: 1 }}
              >
                {li.code}
              </Typography.Text>
            ) : null}
          </div>
          <Typography.Text
            style={{
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
              fontFamily: billingShell.mono,
            }}
          >
            {formatInvoiceMoney(li.amount, payment.currency, locale)}
          </Typography.Text>
        </Flex>
      ))}
      <Flex
        justify="space-between"
        align="center"
        style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${token.colorBorderSecondary}` }}
      >
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {t("billing.invoiceTotal")}
        </Typography.Text>
        <Typography.Text strong style={{ fontSize: 14, fontVariantNumeric: "tabular-nums", fontFamily: billingShell.mono }}>
          {formatInvoiceMoney(payment.amount, payment.currency, locale)}
        </Typography.Text>
      </Flex>
    </div>
  ) : null;

  const FlowIcon = shell.FlowIcon;

  return (
    <div
      style={{
        borderRadius: billingShell.radiusMd,
        border: shell.border,
        background: shell.background,
        overflow: "hidden",
        boxShadow: billingShell.shadow,
      }}
    >
      <Flex
        align="center"
        justify="space-between"
        wrap="wrap"
        gap={16}
        style={{ padding: "14px 16px" }}
      >
        {/* Left: icon + info */}
        <Flex align="center" gap={12} style={{ minWidth: 0, flex: "1 1 200px" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: billingShell.radiusMd,
              background: shell.iconBg,
              border: shell.iconBorder,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: shell.iconColor,
              flexShrink: 0,
            }}
          >
            <FlowIcon style={{ fontSize: 18 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <Flex align="center" gap={8} wrap="wrap" style={{ marginBottom: 3 }}>
              <Typography.Text strong ellipsis style={{ fontSize: 14 }}>
                {payment.summary}
              </Typography.Text>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  padding: "3px 10px",
                  borderRadius: 6,
                  background: isMonthly ? token.colorPrimary : token.colorFillSecondary,
                  border: isMonthly ? `1px solid ${token.colorPrimary}` : `1px solid ${token.colorBorderSecondary}`,
                  color: isMonthly ? token.colorTextLightSolid : token.colorTextSecondary,
                  flexShrink: 0,
                  textTransform: "uppercase",
                }}
              >
                {isMonthly ? t("billing.flowMonthlyShort") : t("billing.flowOneTimeShort")}
              </span>
            </Flex>
            {hasLines ? (
              <Popover
                title={null}
                content={lineItemsPopover}
                trigger="click"
                placement="bottomLeft"
                overlayInnerStyle={{ padding: "14px 16px" }}
              >
                <Typography.Link style={{ fontSize: 12 }}>
                  {t("billing.pendingLineItemsTrigger", { count: lines.length })}
                </Typography.Link>
              </Popover>
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t("billing.invoiceSubtitle")}
              </Typography.Text>
            )}
          </div>
        </Flex>

        {/* Right: amount + action */}
        <Flex align="center" gap={12} wrap="wrap" justify="flex-end" style={{ flexShrink: 0 }}>
          <Typography.Text
            strong
            style={{
              fontSize: 18,
              fontVariantNumeric: "tabular-nums",
              fontFamily: billingShell.mono,
              whiteSpace: "nowrap",
              letterSpacing: "-0.01em",
            }}
          >
            {formatInvoiceMoney(payment.amount, payment.currency, locale)}
          </Typography.Text>

          {payment.payUrl ? (
            <Button
              type="primary"
              icon={<WalletOutlined />}
              onClick={() => onCheckout("hosted")}
              style={{
                height: 38,
                borderRadius: billingShell.radiusMd,
                fontWeight: 600,
                boxShadow: "none",
                paddingInline: 18,
              }}
            >
              {t("billing.payNow")}
            </Button>
          ) : (
            <Flex align="center" gap={8}>
              <LoadingOutlined style={{ fontSize: 16, color: token.colorTextSecondary }} spin />
              {onRefresh ? (
                <Button
                  icon={<ReloadOutlined />}
                  size="small"
                  onClick={() => onRefresh()}
                  style={{ borderRadius: billingShell.radius }}
                >
                  {t("billing.refreshPaymentStatus")}
                </Button>
              ) : null}
            </Flex>
          )}
        </Flex>
      </Flex>
    </div>
  );
}
