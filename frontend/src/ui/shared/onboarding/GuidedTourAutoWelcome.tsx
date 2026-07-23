import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={welcomeOpen}>
      <DialogContent
        hideClose
        className="w-[min(420px,92vw)] gap-0 p-5 pb-4"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="gap-0.5">
          <DialogTitle className="text-base font-semibold leading-snug">
            {t("tour.welcomeTitle")}
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            {t("tour.welcomeBrand")}
          </DialogDescription>
        </DialogHeader>
        <p className="mb-4 mt-3 text-sm leading-relaxed text-foreground">
          {isMobile ? t("tour.welcomeBodyMobile") : t("tour.welcomeBodyDesktop")}
        </p>
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="outline" onClick={onSkip}>
            {t("tour.skip")}
          </Button>
          <Button onClick={onPrimary}>
            {isMobile ? t("tour.gotIt") : t("tour.start")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
