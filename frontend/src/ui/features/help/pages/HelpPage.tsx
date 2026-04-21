import {
  AppstoreOutlined,
  BellOutlined,
  BookOutlined,
  FacebookOutlined,
  LockOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Card, Col, Row, Space, Typography, theme } from "antd";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { UserContentLayout } from "../../../shared/components/UserContentLayout";

function SectionCard({
  icon,
  title,
  body,
  accent,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  accent: string;
}) {
  const { token } = theme.useToken();
  return (
    <Card
      variant="borderless"
      style={{
        height: "100%",
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        boxShadow: "0 1px 4px rgba(15,23,42,0.05)",
      }}
      styles={{
        body: { padding: "18px 18px 16px" },
      }}
    >
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: accent,
            color: token.colorPrimary,
            fontSize: 18,
          }}
        >
          {icon}
        </span>
        <Typography.Title level={5} style={{ margin: 0, fontSize: 16 }}>
          {title}
        </Typography.Title>
        <Typography.Paragraph style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: token.colorTextSecondary }}>
          {body}
        </Typography.Paragraph>
      </Space>
    </Card>
  );
}

export function HelpPage() {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const accent = token.colorFillAlter;

  return (
    <UserContentLayout align="start" maxWidth={960}>
      <Space direction="vertical" size={8} style={{ width: "100%", marginBottom: 8 }}>
        <Typography.Title level={3} style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <BookOutlined style={{ color: token.colorPrimary }} />
          {t("help.title")}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ fontSize: 15, lineHeight: 1.65, marginBottom: 0, maxWidth: 720 }}>
          {t("help.intro")}
        </Typography.Paragraph>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {t("help.tipMenu")}
        </Typography.Text>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <SectionCard
            icon={<AppstoreOutlined />}
            title={t("help.section1Title")}
            body={t("help.section1Body")}
            accent={accent}
          />
        </Col>
        <Col xs={24} md={12}>
          <SectionCard
            icon={<FacebookOutlined />}
            title={t("help.section2Title")}
            body={t("help.section2Body")}
            accent={accent}
          />
        </Col>
        <Col xs={24} md={12}>
          <SectionCard
            icon={<WalletOutlined />}
            title={t("help.section3Title")}
            body={t("help.section3Body")}
            accent={accent}
          />
        </Col>
        <Col xs={24} md={12}>
          <SectionCard
            icon={<LockOutlined />}
            title={t("help.section4Title")}
            body={t("help.section4Body")}
            accent={accent}
          />
        </Col>
        <Col xs={24}>
          <SectionCard
            icon={<BellOutlined />}
            title={t("help.section5Title")}
            body={t("help.section5Body")}
            accent={accent}
          />
        </Col>
      </Row>
    </UserContentLayout>
  );
}
