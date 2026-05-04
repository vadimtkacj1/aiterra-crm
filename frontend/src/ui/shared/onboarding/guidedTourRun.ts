import { driver } from "driver.js";
import type { TFunction } from "i18next";
import { buildAccountTourSteps } from "./accountTourSteps";

export type GuidedDriver = ReturnType<typeof driver>;

export function launchAccountGuidedTour(opts: {
  t: TFunction;
  rtl: boolean;
  onDestroyed?: () => void;
}): GuidedDriver | null {
  const steps = buildAccountTourSteps(opts.t, opts.rtl);
  if (steps.length === 0) return null;

  const d = driver({
    showProgress: true,
    animate: true,
    smoothScroll: true,
    allowClose: true,
    overlayOpacity: 0.88,
    overlayColor: "#020617",
    stagePadding: 10,
    stageRadius: 12,
    popoverOffset: 14,
    popoverClass: "crmDriverPopover",
    progressText: opts.t("tour.progress"),
    nextBtnText: opts.t("tour.next"),
    prevBtnText: opts.t("tour.prev"),
    doneBtnText: opts.t("tour.done"),
    onDestroyed: () => {
      opts.onDestroyed?.();
    },
    steps,
  });
  d.drive();
  return d;
}
