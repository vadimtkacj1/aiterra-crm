import { UserOutlined, DollarOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Descriptions, Form, Select, Space, Spin, Tag, Typography } from "antd";
import type { GlobalToken } from "antd/es/theme/interface";
import type { TFunction } from "i18next";
import type { User } from "@/domain/User";
import type { AccountBillingInstruction, UserBusinessMeta } from "@/services/admin/AdminService";

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
      style={{
        borderRadius: shellRadius,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: shellShadow,
        background: token.colorBgContainer,
      }}
    >
      <Space direction="vertical" size={20} style={{ width: "100%" }}>
        {/* Header */}
        <div>
          <Typography.Title level={4} style={{ margin: 0, marginBottom: 8 }}>
            <UserOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
            {t("admin.payments.stepRecipientTitle")}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t("admin.payments.stepRecipientHint")}
          </Typography.Text>
        </div>

        {/* User Selection */}
        <Form.Item
          name="userId"
          label={
            <Typography.Text strong style={{ fontSize: 15 }}>
              {t("admin.payments.selectClient")}
            </Typography.Text>
          }
          style={{ marginBottom: 0 }}
        >
          <Select
            size="large"
            showSearch
            allowClear
            loading={loadingUsers}
            placeholder={t("admin.payments.selectClientPlaceholder")}
            optionFilterProp="label"
            onChange={(v) => void onUserChange(String(v ?? ""))}
            options={users.map((u) => {
              const phonePart = u.phone ? `, ${u.phone}` : '';
              return {
                value: String(u.id),
                label:
                  u.role === "admin"
                    ? `${u.displayName} (${u.email}${phonePart}, ${t("admin.roles.admin")}) #${u.id}`
                    : `${u.displayName} (${u.email}${phonePart}) #${u.id}`,
              };
            })}
            style={{ width: "100%" }}
          />
        </Form.Item>

        {/* Admin Warning */}
        {selectedIsAdmin && (
          <Alert
            type="warning"
            showIcon
            message={t("admin.payments.adminSelectedWarning")}
            description={t("admin.payments.adminSelectedWarningDesc")}
          />
        )}

        {/* Selected User Info */}
        {selectedUser && !selectedIsAdmin && (
          <Spin spinning={metaLoading}>
            <Card
              size="small"
              style={{
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorder}`,
              }}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label={t("admin.payments.clientName")}>
                  <Typography.Text strong>{selectedUser.displayName || selectedUser.email}</Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label={t("admin.payments.clientEmail")}>
                  {selectedUser.email}
                </Descriptions.Item>
                <Descriptions.Item label={t("admin.payments.accountId")}>
                  {userMeta?.accountId ? (
                    <Tag color="blue">#{userMeta.accountId}</Tag>
                  ) : (
                    <Tag color="default">{t("admin.payments.noAccount")}</Tag>
                  )}
                </Descriptions.Item>
                {userMeta?.metaCampaignId && (
                  <Descriptions.Item label={t("admin.payments.metaCampaign")}>
                    <Tag color="green">{userMeta.metaCampaignId}</Tag>
                  </Descriptions.Item>
                )}
              </Descriptions>

              {/* Live Billing Import */}
              {clientLiveBilling && (clientLiveBilling.chargeType === "one_time" || clientLiveBilling.chargeType === "monthly") && (
                <Alert
                  type="info"
                  showIcon
                  icon={<DollarOutlined />}
                  message={t("admin.payments.liveBillingDetected")}
                  description={
                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                      <Typography.Text>
                        {t("admin.payments.liveBillingAmount", {
                          amount: clientLiveBilling.amount?.toFixed(2) || "0.00",
                          currency: clientLiveBilling.currency || "USD",
                        })}
                      </Typography.Text>
                      <Button size="small" type="primary" onClick={importLiveBillingIntoForm}>
                        {t("admin.payments.importLiveBilling")}
                      </Button>
                    </Space>
                  }
                  style={{ marginTop: 12 }}
                />
              )}
            </Card>
          </Spin>
        )}

        {/* Help Text */}
        {!selectedUser && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message={t("admin.payments.selectUserToStart")}
          />
        )}
      </Space>
    </Card>
  );
}
