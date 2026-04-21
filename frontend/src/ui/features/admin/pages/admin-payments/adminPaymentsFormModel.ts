/**
 * Pure form parsing for admin payments — keeps validation rules in one place
 * so the page hook stays mostly orchestration + UI wiring.
 */

import type { InvoiceTemplateCreateInput } from "../../../../../services/AdminService";
import type { AdminPaymentsFormValues, LineFormRow } from "./types";

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
  const parsed = parseAmountAndLines(values);
  if (!parsed.ok) return parsed;
  return {
    ok: true,
    data: {
      chargeType,
      amount: parsed.amount,
      currency: values.currency ?? "USD",
      description: values.description?.trim() || null,
      lineItems: parsed.lineItems,
    },
  };
}

export type SubmitBillingParseResult =
  | { ok: true; amount: number | null; lineItems: { code: string; label: string; amount: number }[] | undefined }
  | { ok: false; message: FormMessage };

/** For setAccountBillingInstruction after form submit (chargeType may be none). */
export function parseBillingInstructionFromSubmit(values: AdminPaymentsFormValues): SubmitBillingParseResult {
  const chargeType = values.chargeType;
  if (chargeType === "none") {
    return { ok: true, amount: null, lineItems: undefined };
  }
  const parsed = parseAmountAndLines(values);
  if (!parsed.ok) return parsed;
  return { ok: true, amount: parsed.amount, lineItems: parsed.lineItems };
}
