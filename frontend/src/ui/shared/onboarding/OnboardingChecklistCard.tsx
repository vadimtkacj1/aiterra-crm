import {
  BellOutlined,
  CloseOutlined,
  DownOutlined,
  LineChartOutlined,
  LockOutlined,
  RocketOutlined,
  ShopOutlined,
  UpOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Flex, Progress, Steps, Typography, theme } from "antd";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { accountPath, Paths } from "../../navigation/paths";
import { onboardingAllDone, type OnboardingStored } from "./onboardingStorage";

type Props = {
  state: OnboardingStored;
  dismiss: () => void;
  toggleCollapsed: () => void;
  hasMeta: boolean;
  accountId: string | undefined;
};

type StepDef = {
  key: string;
  done: boolean;
  title: string;
  hint: string;
  to: string;
};

export function OnboardingChecklistCard({ state, dismiss, toggleCollapsed, hasMeta, accountId }: Props) {
  const { t } = useTranslation();
  const { token } = theme.useToken();

  const billingTo = accountId ? accountPath(accountId, "billing") : Paths.accounts;
  const metaTo = accountId ? accountPath(accountId, "meta") : Paths.accounts;
  const settingsTo = accountId ? accountPath(accountId, "settings") : Paths.accounts;

  const stepsDef = useMemo((): StepDef[] => {
    const base: StepDef[] = [
      {
        key: "business",
        done: state.business,
        title: t("onboarding.stepBusiness"),
        hint: t("onboarding.stepBusinessHint"),
        to: Paths.accounts,
      },
      {
        key: "billing",
        done: state.billing,
        title: t("onboarding.stepBilling"),
        hint: t("onboarding.stepBillingHint"),
        to: billingTo,
      },
    ];
    if (hasMeta) {
      base.push({
        key: "meta",
        done: state.meta,
        title: t("onboarding.stepMeta"),
        hint: t("onboarding.stepMetaHint"),
        to: metaTo,
      });
    }
    base.push({
      key: "settings",
      done: state.settings,
      title: t("onboarding.stepSettings"),
      hint: t("onboarding.stepSettingsHint"),
      to: settingsTo,
    });
    return base;
  }, [state, hasMeta, t, billingTo, metaTo, settingsTo]);

  const { doneCount, total, percent, firstOpen } = useMemo(() => {
    const total = stepsDef.length;
    const doneCount = stepsDef.filter((s) => s.done).length;
    const percent = total ? Math.round((doneCount / total) * 100) : 0;
    const firstOpen = stepsDef.find((s) => !s.done);
    return { doneCount, total, percent, firstOpen };
  }, [stepsDef]);

  if (state.dismissed || onboardingAllDone(state, hasMeta)) {
    return null;
  }

  if (state.collapsed) {
    return (
      <Alert
        type="info"
        showIcon
        icon={<RocketOutlined />}
        style={{ marginBottom: 16, borderRadius: token.borderRadiusLG }}
        message={
          <Flex align="center" justify="space-between" gap={12} wrap="wrap">
            <Flex align="center" gap={12} style={{ flex: 1, minWidth: 0 }}>
              <Typography.Text strong style={{ whiteSpace: "nowrap" }}>
                {t("onboarding.collapsedTitle", { done: String(doneCount), total: String(total) })}
              </Typography.Text>
              <Progress percent={percent} size="small" style={{ flex: 1, minWidth: 120, maxWidth: 220 }} />
            </Flex>
            <Flex gap={8} wrap="wrap">
              {firstOpen ? (
                <Link to={firstOpen.to}>
                  <Button type="primary" size="small">
                    {t("onboarding.continueStep")}
                  </Button>
                </Link>
              ) : null}
              <Button type="link" size="small" icon={<UpOutlined />} onClick={toggleCollapsed}>
                {t("onboarding.expand")}
              </Button>
              <Button type="text" size="small" icon={<CloseOutlined />} aria-label={t("onboarding.dismiss")} onClick={dismiss} />
            </Flex>
          </Flex>
        }
      />
    );
  }

  const firstIncompleteIdx = stepsDef.findIndex((x) => !x.done);

  const stepItems = stepsDef.map((s, i) => {
    const active = i === firstIncompleteIdx && !s.done;
    return {
      title: (
        <Flex align="center" gap={8} wrap="wrap">
          {s.done ? (
            <Typography.Text type="secondary" strong={false}>
              {s.title}
            </Typography.Text>
          ) : (
            <Link to={s.to} style={{ fontWeight: 600, color: active ? token.colorPrimary : undefined }}>
              {s.title}
            </Link>
          )}
        </Flex>
      ),
      description: (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 4, fontSize: 13, maxWidth: 520 }}>
          {s.hint}
        </Typography.Paragraph>
      ),
      status: (s.done ? "finish" : active ? "process" : "wait") as "wait" | "process" | "finish",
    };
  });

  return (
    <Card
      size="small"
      style={{
        marginBottom: 20,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: `linear-gradient(135deg, ${token.colorFillAlter} 0%, ${token.colorBgContainer} 48%, ${token.colorPrimaryBg} 100%)`,
        boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
      }}
      styles={{ body: { padding: "16px 18px 18px" } }}
      title={
        <Flex align="center" justify="space-between" gap={12} wrap="wrap" style={{ width: "100%" }}>
          <Flex align="center" gap={10}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: token.colorPrimaryBg,
                color: token.colorPrimary,
              }}
            >
              <RocketOutlined style={{ fontSize: 18 }} />
            </span>
            <div>
              <Typography.Text strong style={{ fontSize: 15, display: "block" }}>
                {t("onboarding.cardTitle")}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t("onboarding.cardSubtitle", { done: String(doneCount), total: String(total) })}
              </Typography.Text>
            </div>
          </Flex>
          <Flex gap={4}>
            <Button type="text" size="small" icon={<DownOutlined />} aria-label={t("onboarding.minimize")} onClick={toggleCollapsed} />
            <Button type="text" size="small" icon={<CloseOutlined />} aria-label={t("onboarding.dismiss")} onClick={dismiss} />
          </Flex>
        </Flex>
      }
    >
      <Typography.Paragraph style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.55, color: token.colorTextSecondary }}>
        {t("onboarding.cardIntro")}
      </Typography.Paragraph>
      {!hasMeta ? (
        <Typography.Paragraph
          type="secondary"
          style={{
            marginTop: -6,
            marginBottom: 14,
            fontSize: 12,
            lineHeight: 1.55,
            padding: "10px 12px",
            borderRadius: token.borderRadius,
            background: token.colorFillAlter,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          {accountId ? t("onboarding.metaSkippedAccount") : t("onboarding.metaSkippedGlobal")}
        </Typography.Paragraph>
      ) : null}

      <Progress percent={percent} status={percent === 100 ? "success" : "active"} style={{ marginBottom: 16 }} />

      <Flex gap={10} wrap="wrap" style={{ marginBottom: 14 }}>
        <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {t("onboarding.legend")}
        </Typography.Text>
        <Flex gap={14} wrap="wrap" align="center">
          <Flex align="center" gap={6}>
            <ShopOutlined />
            <span style={{ fontSize: 12 }}>{t("onboarding.legendBusiness")}</span>
          </Flex>
          <Flex align="center" gap={6}>
            <WalletOutlined />
            <span style={{ fontSize: 12 }}>{t("onboarding.legendBilling")}</span>
          </Flex>
          {hasMeta ? (
            <Flex align="center" gap={6}>
              <LineChartOutlined />
              <span style={{ fontSize: 12 }}>{t("onboarding.legendMeta")}</span>
            </Flex>
          ) : null}
          <Flex align="center" gap={6}>
            <LockOutlined />
            <span style={{ fontSize: 12 }}>{t("onboarding.legendSettings")}</span>
          </Flex>
          <Flex align="center" gap={6}>
            <BellOutlined />
            <span style={{ fontSize: 12 }}>{t("onboarding.legendBell")}</span>
          </Flex>
        </Flex>
      </Flex>

      <Steps direction="vertical" size="small" items={stepItems} />

      <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginTop: 16 }}>
        {firstOpen ? (
          <Link to={firstOpen.to}>
            <Button type="primary">{t("onboarding.ctaContinue")}</Button>
          </Link>
        ) : (
          <Typography.Text type="success" strong>
            {t("onboarding.allDone")}
          </Typography.Text>
        )}
        <Flex gap={8} wrap="wrap" justify="flex-end" style={{ marginInlineStart: "auto" }}>
          <Link to={Paths.help}>
            <Button type="default">{t("onboarding.openHelpFull")}</Button>
          </Link>
        </Flex>
      </Flex>
    </Card>
  );
}
