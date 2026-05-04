/**
 * Pure form parsing for admin payments; keeps validation rules in one place
 * so the page hook stays mostly orchestration + UI wiring.
 */

import type { InvoiceTemplateCreateInput } from "@/services/admin/AdminService";
import type { AdminPaymentsFormValues, LineFormRow } from "./types";

/** Live API stores per-month `amount` for installment plans; the form edits contract total. */
export function billingInstructionAmountForForm(bi: {
  chargeType: string;
  amount: number | null;
  installmentMonths?: number | null;
  installmentTotalAmount?: number | null;
}): number | undefined {
  if (
    bi.chargeType === "monthly" &&
    bi.installmentMonths != null &&
    bi.installmentMonths >= 2 &&
    bi.installmentTotalAmount != null
  ) {
    return bi.installmentTotalAmount;
  }
  return bi.amount ?? undefined;
}

export type FormMessage = { level: "error" | "warning"; key: string };

export type BillingLinesResult =
  | { ok: true; amount: number; lineItems: { code: string; label: string; amount: number }[] | undefined }
  | { ok: false; message: FormMessage };

/** When charge is one_time / monthly: resolve single amount or line breakdown. */
export function parseAmountAndLines(values: AdminPaymentsFormValues): BillingLinesResult {
  if (values.useBreakdown && values.lineItems && values.lineItems.length > 0) {
    const lines = values.lineItems.filter(
      (r: LineFormRow | undefined) => r?.label?.trim() && r.amount != null && Number(r.amount) > 0,
    );
    if (!lines.length) {
      return { ok: false, message: { level: "error", key: "admin.payments.linesInvalid" } };
    }
    const amount = Math.round(lines.reduce((s, r) => s + Number(r!.amount), 0) * 100) / 100;
    const lineItems = lines.map((r) => ({
      code: (r!.code ?? "").trim(),
      label: (r!.label ?? "").trim(),
      amount: Number(r!.amount),
    }));
    const sumCheck = lineItems.reduce((s, li) => s + li.amount, 0);
    if (Math.abs(sumCheck - amount) > 0.02) {
      return { ok: false, message: { level: "error", key: "admin.payments.linesInvalid" } };
    }
    return { ok: true, amount, lineItems };
  }

  const a = values.amount;
  if (typeof a !== "number" || a <= 0) {
    return { ok: false, message: { level: "error", key: "admin.form.billingAmountRequired" } };
  }
  return { ok: true, amount: a, lineItems: undefined };
}

export type TemplatePayloadResult =
  | { ok: true; data: InvoiceTemplateCreateInput }
  | { ok: false; message: FormMessage };

export function buildInvoiceTemplatePayload(values: AdminPaymentsFormValues): TemplatePayloadResult {
  const chargeType = values.chargeType;
  if (chargeType !== "one_time" && chargeType !== "monthly") {
    return { ok: false, message: { level: "warning", key: "admin.payments.templateNeedCharge" } };
  }
  const rawSplit = values.splitAcrossMonths;
  const splitN =
    chargeType === "monthly" && typeof rawSplit === "number" && rawSplit >= 2 ? Math.min(60, Math.floor(rawSplit)) : 0;
  const splitActive = splitN >= 2;
  if (splitActive && values.useBreakdown) {
    return { ok: false, message: { level: "error", key: "admin.payments.splitNoLines" } };
  }
  const parsed = parseAmountAndLines(values);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    data: {
      chargeType,
      amount: parsed.amount,
      currency: values.currency ?? "USD",
      description: values.description?.trim() || null,
      lineItems: splitActive ? undefined : parsed.lineItems,
      splitAcrossMonths: splitActive ? splitN : undefined,
    },
  };
}

export type SubmitBillingParseResult =
  | {
      ok: true;
      amount: number | null;
      lineItems: { code: string; label: string; amount: number }[] | undefined;
      splitAcrossMonths?: number | undefined;
    }
  | { ok: false; message: FormMessage };

/** For setAccountBillingInstruction after form submit (chargeType may be none). */
export function parseBillingInstructionFromSubmit(values: AdminPaymentsFormValues): SubmitBillingParseResult {
  const chargeType = values.chargeType;
  if (chargeType === "none") {
    return { ok: true, amount: null, lineItems: undefined, splitAcrossMonths: undefined };
  }
  const rawSplit = values.splitAcrossMonths;
  const splitN =
    chargeType === "monthly" && typeof rawSplit === "number" && rawSplit >= 2 ? Math.min(60, Math.floor(rawSplit)) : 0;
  const splitActive = splitN >= 2;
  if (splitActive && values.useBreakdown) {
    return { ok: false, message: { level: "error", key: "admin.payments.splitNoLines" } };
  }
  const parsed = parseAmountAndLines(values);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    amount: parsed.amount,
    lineItems: splitActive ? undefined : parsed.lineItems,
    splitAcrossMonths: splitActive ? splitN : undefined,
  };
}
