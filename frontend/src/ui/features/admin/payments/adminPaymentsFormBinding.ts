/**
 * Maps API billing / template shapes → Ant Design form patches (single source of truth).
 */

import type { AccountBillingInstruction, InvoiceTemplateRow } from "@/services/admin/AdminService";
import { billingInstructionAmountForForm } from "./adminPaymentsFormModel";
import type { AdminPaymentsFormValues, BillingSchedule, LineFormRow } from "./types";

function scheduleFromInstruction(bi: AccountBillingInstruction): BillingSchedule | undefined {
  if (bi.testIntervalMinutes != null) return "minutely";
  if (bi.billingWeekDay != null) return "weekly";
  if (bi.billingDay != null) return "monthly";
  return undefined;
}

export function formPatchFromBillingInstruction(bi: AccountBillingInstruction): Partial<AdminPaymentsFormValues> {
  const hasLines = Boolean(bi.lineItems && bi.lineItems.length > 0);
  return {
    chargeType: bi.chargeType,
    amount: billingInstructionAmountForForm(bi),
    currency: bi.currency || "USD",
    description: bi.description ?? undefined,
    useBreakdown: hasLines || bi.chargeType === "none" ? hasLines : true,
    lineItems: hasLines
      ? bi.lineItems!.map(
          (li): LineFormRow => ({
            code: li.code,
            label: li.label,
            amount: li.amount,
          }),
        )
      : [],
    splitAcrossMonths: bi.installmentMonths ?? undefined,
    billingSchedule: scheduleFromInstruction(bi),
    billingDay: bi.billingDay ?? undefined,
    billingWeekDay: bi.billingWeekDay ?? undefined,
    testIntervalMinutes: bi.testIntervalMinutes ?? undefined,
  };
}

export function formPatchFromInvoiceTemplate(tpl: InvoiceTemplateRow): Partial<AdminPaymentsFormValues> {
  const hasLines = Boolean(tpl.lineItems && tpl.lineItems.length > 0);
  const splitM = tpl.installmentMonths;
  return {
    chargeType: tpl.chargeType,
    amount: hasLines ? undefined : tpl.amount,
    currency: tpl.currency || "USD",
    description: tpl.description ?? undefined,
    useBreakdown: hasLines,
    lineItems: hasLines
      ? tpl.lineItems!.map(
          (li): LineFormRow => ({
            code: li.code ?? "",
            label: li.label,
            amount: li.amount,
          }),
        )
      : [],
    splitAcrossMonths: typeof splitM === "number" && splitM >= 2 ? splitM : undefined,
    billingDay: tpl.billingDay ?? undefined,
  };
}

export function linesRunningTotalFromWatch(
  lineItemsW: unknown,
  useBreakdownW: unknown,
): number | null {
  if (!useBreakdownW || !Array.isArray(lineItemsW)) return null;
  const rows = lineItemsW.filter(
    (r: LineFormRow | undefined) =>
      r && String(r.label ?? "").trim() && r.amount != null && Number(r.amount) > 0,
  );
  if (!rows.length) return 0;
  return Math.round(rows.reduce((s, r) => s + Number(r!.amount), 0) * 100) / 100;
}
