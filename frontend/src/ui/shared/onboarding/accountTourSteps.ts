import type { DriveStep } from "driver.js";
import type { TFunction } from "i18next";

type Side = "top" | "right" | "bottom" | "left" | "over";

const TARGET_ORDER: { target: string; titleKey: string; descKey: string; side?: Side }[] = [
  { target: "sidebar-nav", titleKey: "tour.step.sidebarTitle", descKey: "tour.step.sidebarDesc", side: "right" },
  { target: "nav-businesses", titleKey: "tour.step.businessesTitle", descKey: "tour.step.businessesDesc", side: "right" },
  { target: "nav-billing", titleKey: "tour.step.billingTitle", descKey: "tour.step.billingDesc", side: "right" },
  { target: "nav-meta", titleKey: "tour.step.metaTitle", descKey: "tour.step.metaDesc", side: "right" },
  { target: "nav-google", titleKey: "tour.step.googleTitle", descKey: "tour.step.googleDesc", side: "right" },
  { target: "nav-contracts", titleKey: "tour.step.contractsTitle", descKey: "tour.step.contractsDesc", side: "right" },
  { target: "nav-help", titleKey: "tour.step.helpTitle", descKey: "tour.step.helpDesc", side: "right" },
  { target: "nav-settings", titleKey: "tour.step.navSettingsTitle", descKey: "tour.step.navSettingsDesc", side: "right" },
  { target: "header-account", titleKey: "tour.step.headerAccountTitle", descKey: "tour.step.headerAccountDesc", side: "bottom" },
  { target: "header-notifications", titleKey: "tour.step.notificationsTitle", descKey: "tour.step.notificationsDesc", side: "bottom" },
  { target: "quick-start-card", titleKey: "tour.step.checklistTitle", descKey: "tour.step.checklistDesc", side: "bottom" },
];

function popoverSide(row: (typeof TARGET_ORDER)[number], rtl: boolean): Side {
  if (row.side === "bottom") return "bottom";
  return rtl ? "left" : "right";
}

export function buildAccountTourSteps(t: TFunction, rtl: boolean): DriveStep[] {
  const steps: DriveStep[] = [];
  for (const row of TARGET_ORDER) {
    const el = document.querySelector(`[data-tour-target="${row.target}"]`);
    if (!el) continue;
    steps.push({
      element: el,
      popover: {
        title: t(row.titleKey),
        description: t(row.descKey),
        side: popoverSide(row, rtl),
        align: "start",
      },
    });
  }
  return steps;
}
