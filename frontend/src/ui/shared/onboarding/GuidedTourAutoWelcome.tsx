import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
        className="w-[min(420px,92vw)]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Short dialog, but it uses the same header/body/footer sections as
            every other one — the padding lives there, not on the shell. */}
        <DialogHeader className="gap-0.5 pe-5">
          <DialogTitle className="text-base">{t("tour.welcomeTitle")}</DialogTitle>
          <DialogDescription className="text-[13px]">
            {t("tour.welcomeBrand")}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p className="m-0 text-sm leading-relaxed text-foreground">
            {isMobile ? t("tour.welcomeBodyMobile") : t("tour.welcomeBodyDesktop")}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onSkip}>
            {t("tour.skip")}
          </Button>
          <Button onClick={onPrimary}>
            {isMobile ? t("tour.gotIt") : t("tour.start")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
