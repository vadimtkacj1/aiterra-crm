import {
  AppstoreOutlined,
  BellOutlined,
  FacebookOutlined,
  LockOutlined,
  PlayCircleOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Flex, Row, Typography } from "antd";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/ui/shared/components/PageHeader";
import { UserContentLayout } from "@/ui/shared/components/UserContentLayout";
import { useGuidedTour } from "@/ui/shared/onboarding/guidedTourContext";

function SectionCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card style={{ height: "100%" }} styles={{ body: { padding: "18px 20px" } }}>
      <Flex vertical gap={8}>
        <Flex align="center" gap={10}>
          <span
            style={{
              color: "var(--ds-text-tertiary)",
              fontSize: 18,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {icon}
          </span>
          <Typography.Title level={5} style={{ margin: 0, fontSize: 15 }}>
            {title}
          </Typography.Title>
        </Flex>
        <Typography.Paragraph
          style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "var(--ds-text-secondary)" }}
        >
          {body}
        </Typography.Paragraph>
      </Flex>
    </Card>
  );
}

export function HelpPage() {
  const { t } = useTranslation();
  const { startGuidedTour, guidedTourAvailable } = useGuidedTour();

  return (
    <UserContentLayout align="start" maxWidth={960}>
      <PageHeader
        title={t("help.title")}
        subtitle={t("help.intro")}
        actions={
          guidedTourAvailable ? (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              title={t("help.runTourSub")}
              onClick={() => startGuidedTour?.()}
            >
              {t("tour.start")}
            </Button>
          ) : undefined
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <SectionCard
            icon={<AppstoreOutlined />}
            title={t("help.section1Title")}
            body={t("help.section1Body")}
          />
        </Col>
        <Col xs={24} md={12}>
          <SectionCard
            icon={<FacebookOutlined />}
            title={t("help.section2Title")}
            body={t("help.section2Body")}
          />
        </Col>
        <Col xs={24} md={12}>
          <SectionCard
            icon={<WalletOutlined />}
            title={t("help.section3Title")}
            body={t("help.section3Body")}
          />
        </Col>
        <Col xs={24} md={12}>
          <SectionCard
            icon={<LockOutlined />}
            title={t("help.section4Title")}
            body={t("help.section4Body")}
          />
        </Col>
        <Col xs={24} md={12}>
          <SectionCard
            icon={<BellOutlined />}
            title={t("help.section5Title")}
            body={t("help.section5Body")}
          />
        </Col>
      </Row>
    </UserContentLayout>
  );
}
