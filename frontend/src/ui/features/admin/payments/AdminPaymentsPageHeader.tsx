import { FolderOpenOutlined, ShoppingOutlined } from "@ant-design/icons";
import { Button, Flex, Typography } from "antd";
import type { GlobalToken } from "antd/es/theme/interface";
import type { TFunction } from "i18next";

type Props = {
  t: TFunction;
  token: GlobalToken;
  shellRadius: number;
  shellShadow: string;
  loadingUsers: boolean;
  onOpenLibrary: () => void;
};

export function AdminPaymentsPageHeader({
  t,
  token,
  shellRadius,
  shellShadow,
  loadingUsers,
  onOpenLibrary,
}: Props) {
  return (
    <div
      style={{
        borderRadius: shellRadius,
        padding: "18px 20px",
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: shellShadow,
      }}
    >
      <Flex gap={18} align="flex-start" wrap="wrap" justify="space-between">
        <Flex gap={18} align="flex-start" wrap="wrap" style={{ flex: "1 1 280px", minWidth: 0 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: token.colorBgContainer,
              border: `1px solid ${token.colorPrimaryBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: token.colorPrimary,
              flexShrink: 0,
            }}
          >
            <ShoppingOutlined style={{ fontSize: 22 }} />
          </div>
          <div style={{ minWidth: 0, flex: "1 1 240px" }}>
            <Typography.Title level={3} style={{ margin: "0 0 6px", fontWeight: 700, letterSpacing: "-0.01em" }}>
              {t("admin.payments.title")}
            </Typography.Title>
            <Typography.Paragraph
              type="secondary"
              style={{ marginBottom: 0, fontSize: 13, lineHeight: 1.5, maxWidth: 720 }}
            >
              {t("admin.payments.introShort")}
            </Typography.Paragraph>
          </div>
        </Flex>
        <Button
          type="default"
          icon={<FolderOpenOutlined />}
          onClick={onOpenLibrary}
          loading={loadingUsers}
          style={{ flexShrink: 0, alignSelf: "flex-start", marginTop: 2 }}
        >
          {t("admin.payments.libraryDrawerTrigger")}
        </Button>
      </Flex>
    </div>
  );
}
