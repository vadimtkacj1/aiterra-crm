import { Button, Flex, Modal, Typography, theme } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OnboardingStored } from "./onboardingStorage";
import { useGuidedTour } from "./guidedTourContext";

type Props = {
  isAdmin: boolean;
  isMobile: boolean;
  showAccountContext: boolean;
  suppressAutoWelcome: boolean;
  onboardingState: OnboardingStored | null;
  dismissGuidedTour: () => void;
};

export function GuidedTourAutoWelcome({
  isAdmin,
  isMobile,
  showAccountContext,
  suppressAutoWelcome,
  onboardingState,
  dismissGuidedTour,
}: Props) {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { startGuidedTour } = useGuidedTour();
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  const dismissed = onboardingState?.guidedTourDismissed === true;

  useEffect(() => {
    if (dismissed) setWelcomeOpen(false);
  }, [dismissed]);

  useEffect(() => {
    if (
      suppressAutoWelcome ||
      isAdmin ||
      !showAccountContext ||
      !onboardingState ||
      dismissed
    ) {
      return;
    }
    const id = window.setTimeout(() => setWelcomeOpen(true), 700);
    return () => window.clearTimeout(id);
  }, [suppressAutoWelcome, isAdmin, showAccountContext, onboardingState, dismissed]);

  const onSkip = () => {
    setWelcomeOpen(false);
    dismissGuidedTour();
  };

  const onPrimary = () => {
    if (isMobile) {
      setWelcomeOpen(false);
      dismissGuidedTour();
      return;
    }
    setWelcomeOpen(false);
    startGuidedTour?.();
    dismissGuidedTour();
  };

  if (isAdmin || !showAccountContext || !onboardingState || dismissed) {
    return null;
  }

  return (
    <Modal
      open={welcomeOpen}
      footer={null}
      closable={false}
      centered
      maskClosable={false}
      width="min(420px, 92vw)"
      styles={{
        root: { padding: 0 },
        container: {
          borderRadius: token.borderRadiusLG * 1.5,
          overflow: "hidden",
          boxShadow: token.boxShadowSecondary,
          border: `1px solid ${token.colorBorderSecondary}`,
        },
        body: { padding: "20px 20px 16px" },
        mask: { backdropFilter: "blur(4px)" },
      }}
    >
      <Typography.Title level={5} style={{ margin: "0 0 2px", color: token.colorTextHeading }}>
        {t("tour.welcomeTitle")}
      </Typography.Title>
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
        {t("tour.welcomeBrand")}
      </Typography.Text>
      <Typography.Paragraph style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.55, color: token.colorText }}>
        {isMobile ? t("tour.welcomeBodyMobile") : t("tour.welcomeBodyDesktop")}
      </Typography.Paragraph>
      <Flex gap={10} justify="flex-end" wrap="wrap">
        <Button onClick={onSkip}>
          {t("tour.skip")}
        </Button>
        <Button type="primary" onClick={onPrimary}>
          {isMobile ? t("tour.gotIt") : t("tour.start")}
        </Button>
      </Flex>
    </Modal>
  );
}
