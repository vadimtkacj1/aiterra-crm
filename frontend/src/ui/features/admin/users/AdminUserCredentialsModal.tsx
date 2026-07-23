import { CheckCircleFilled, CopyOutlined } from "@ant-design/icons";
import { Alert, App, Button, Flex, Typography } from "antd";
import type { TFunction } from "i18next";
import { AppModal } from "@/ui/shared/components/AppModal";

type Credentials = { name: string; email: string; password: string };

type Props = {
  t: TFunction;
  credentials: Credentials | null;
  onClose: () => void;
};

/** One-time sign-in details screen after creating an account.
    The password is not retrievable later, so the admin copies it here. */
export function AdminUserCredentialsModal({ t, credentials, onClose }: Props) {
  const { message } = App.useApp();
  if (!credentials) return null;

  const copyAll = async () => {
    await navigator.clipboard.writeText(`${credentials.email}\n${credentials.password}`);
    void message.success(t("admin.credentials.copied"));
  };

  const row = (label: string, value: string) => (
    <Flex justify="space-between" align="center" gap={12} style={{ paddingBlock: 10, borderBottom: "1px solid var(--ds-border-subtle)" }}>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <Typography.Text dir="ltr" copyable style={{ fontFamily: "var(--ds-font-family-mono)", fontSize: 13 }}>
        {value}
      </Typography.Text>
    </Flex>
  );

  return (
    <AppModal
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <CheckCircleFilled style={{ color: "var(--ds-color-success)" }} />
          {t("admin.credentials.title")}
        </span>
      }
      open
      width={440}
      onCancel={onClose}
      footer={
        <Flex justify="space-between" gap={8}>
          <Button icon={<CopyOutlined />} onClick={() => void copyAll()}>
            {t("admin.credentials.copyAll")}
          </Button>
          <Button type="primary" onClick={onClose}>
            {t("common.close")}
          </Button>
        </Flex>
      }
    >
      <Typography.Text strong style={{ display: "block", marginBottom: 4 }}>
        {credentials.name}
      </Typography.Text>
      {row(t("admin.form.email"), credentials.email)}
      {row(t("admin.form.password"), credentials.password)}
      <Alert type="warning" showIcon message={t("admin.credentials.note")} style={{ marginTop: 16 }} />
    </AppModal>
  );
}
