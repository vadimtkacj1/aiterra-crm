import { Alert, Button, Card, Flex, Form, Select, Spin, Tag, Typography } from "antd";
import type { GlobalToken } from "antd/es/theme/interface";
import type { TFunction } from "i18next";
import type { User } from "../../../../../domain/User";
import type { AccountBillingInstruction, UserBusinessMeta } from "../../../../../services/AdminService";
import { SectionStep } from "./billingUi";

type Props = {
  t: TFunction;
  token: GlobalToken;
  shellRadius: number;
  shellShadow: string;
  loadingUsers: boolean;
  users: User[];
  onUserChange: (userId: string) => void | Promise<void>;
  selectedIsAdmin: boolean;
  selectedUser: User | undefined;
  userMeta: UserBusinessMeta | null;
  metaLoading: boolean;
  clientLiveBilling: AccountBillingInstruction | null;
  importLiveBillingIntoForm: () => void;
};

export function RecipientStepCard({
  t,
  token,
  shellRadius,
  shellShadow,
  loadingUsers,
  users,
  onUserChange,
  selectedIsAdmin,
  selectedUser,
  userMeta,
  metaLoading,
  clientLiveBilling,
  importLiveBillingIntoForm,
}: Props) {
  return (
    <Card
      variant="borderless"
      style={{
        borderRadius: shellRadius,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: shellShadow,
      }}
      styles={{ body: { padding: "18px 20px 20px" } }}
    >
      <SectionStep
        step={t("admin.payments.stepLabel1")}
        title={t("admin.payments.stepRecipientTitle")}
        hint={t("admin.payments.stepRecipientHint")}
      />
      <Form.Item name="userId" label={t("admin.payments.selectUser")}>
        <Select
          size="large"
          showSearch
          allowClear
          placeholder={t("admin.payments.selectUserPlaceholder")}
          optionFilterProp="label"
          loading={loadingUsers}
          onChange={(v) => void onUserChange(String(v ?? ""))}
          options={users.map((u) => ({
            value: String(u.id),
            label:
              u.role === "admin"
                ? `${u.displayName} (${u.email}) — ${t("admin.roles.admin")}`
                : `${u.displayName} (${u.email})`,
          }))}
          style={{ borderRadius: 10, maxWidth: 640 }}
        />
      </Form.Item>

      {selectedIsAdmin ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16, borderRadius: 10 }}
          message={t("admin.payments.adminSelectedWarning")}
        />
      ) : null}

      <Spin spinning={metaLoading}>
        {selectedUser && userMeta?.accountId != null ? (
          <div
            style={{
              marginTop: 4,
              marginBottom: 8,
              padding: "12px 14px",
              borderRadius: 10,
              background: selectedIsAdmin ? token.colorWarningBg : token.colorFillAlter,
              border: `1px solid ${selectedIsAdmin ? token.colorWarningBorder : token.colorBorderSecondary}`,
            }}
          >
            <Typography.Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>
              {t("admin.payments.clientSelectedSummary")}
            </Typography.Text>
            <Flex wrap="wrap" gap={8} align="center">
              <Typography.Text strong style={{ fontSize: 15 }}>
                {selectedUser.displayName}
              </Typography.Text>
              {selectedIsAdmin ? (
                <Tag color="orange" style={{ borderRadius: 6, margin: 0 }}>
                  {t("admin.roles.admin")}
                </Tag>
              ) : (
                <Tag style={{ borderRadius: 6, margin: 0 }}>{t("admin.roles.user")}</Tag>
              )}
              <Tag style={{ borderRadius: 6, margin: 0, color: token.colorTextSecondary }}>
                {t("admin.payments.businessId")} {userMeta.accountId}
              </Tag>
            </Flex>
          </div>
        ) : null}
        {userMeta && userMeta.accountId == null ? (
          <Alert type="warning" showIcon style={{ marginTop: 4, borderRadius: 10 }} message={t("admin.payments.noBusiness")} />
        ) : null}
      </Spin>
      {clientLiveBilling &&
      (clientLiveBilling.chargeType === "one_time" || clientLiveBilling.chargeType === "monthly") &&
      userMeta?.accountId != null ? (
        <Button type="link" onClick={importLiveBillingIntoForm} style={{ paddingLeft: 0, marginTop: 4 }}>
          {t("admin.payments.importClientBilling")}
        </Button>
      ) : null}
    </Card>
  );
}
