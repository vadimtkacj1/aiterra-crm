import type { TFunction } from "i18next";
import { useCallback, useEffect, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import type { AccountBillingInstruction, AdminService, InvoiceTemplateRow, UserBusinessMeta } from "@/services/admin/AdminService";
import type { User } from "@/domain/User";
import { formPatchFromBillingInstruction, formPatchFromInvoiceTemplate, linesRunningTotalFromWatch } from "./adminPaymentsFormBinding";
import type { AdminPaymentsMessageLike } from "./adminPaymentsLibraryTypes";
import type { AdminPaymentsFormValues } from "./types";

/** Mirrors the antd `<Form initialValues>` this page shipped with (RHF needs defined defaults). */
export const ADMIN_PAYMENTS_FORM_DEFAULTS: AdminPaymentsFormValues = {
  userId: "",
  chargeType: "one_time",
  amount: null,
  currency: "ILS",
  description: "",
  useBreakdown: false,
  lineItems: [],
  splitAcrossMonths: undefined,
  billingSchedule: undefined,
  billingDay: undefined,
  billingWeekDay: undefined,
  testIntervalMinutes: undefined,
};

export function useAdminPaymentsComposerSession(
  t: TFunction,
  admin: AdminService,
  message: AdminPaymentsMessageLike,
  users: User[],
) {
  const form = useForm<AdminPaymentsFormValues>({ defaultValues: ADMIN_PAYMENTS_FORM_DEFAULTS });
  const [userMeta, setUserMeta] = useState<UserBusinessMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [clientLiveBilling, setClientLiveBilling] = useState<AccountBillingInstruction | null>(null);

  const userIdW = form.watch("userId");
  const lineItemsW = form.watch("lineItems");
  const useBreakdownW = form.watch("useBreakdown");
  const chargeTypeW = form.watch("chargeType");
  const splitAcrossMonthsW = form.watch("splitAcrossMonths");
  const currencyW = form.watch("currency") ?? "USD";

  /** antd `form.setFieldsValue` equivalent: partial patch on top of current values. */
  const patchForm = useCallback(
    (patch: Partial<AdminPaymentsFormValues>) => {
      for (const [key, value] of Object.entries(patch) as [FieldPath<AdminPaymentsFormValues>, never][]) {
        form.setValue(key, value);
      }
    },
    [form],
  );

  useEffect(() => {
    if (chargeTypeW !== "monthly") {
      form.setValue("splitAcrossMonths", undefined);
      form.setValue("billingDay", undefined);
    }
  }, [chargeTypeW, form]);

  useEffect(() => {
    const n = typeof splitAcrossMonthsW === "number" ? splitAcrossMonthsW : 0;
    if (chargeTypeW === "monthly" && n >= 2 && useBreakdownW) {
      form.setValue("useBreakdown", false);
      form.setValue("lineItems", []);
    }
  }, [chargeTypeW, splitAcrossMonthsW, useBreakdownW, form]);

  const refreshBillingFormForAccount = useCallback(
    async (accountId: number) => {
      try {
        const bi = await admin.getAccountBillingInstruction(accountId);
        setClientLiveBilling(bi);
        patchForm(formPatchFromBillingInstruction(bi));
      } catch {
        /* ignore */
      }
    },
    [admin, patchForm],
  );

  const onUserChange = useCallback(
    async (userId: string) => {
      setUserMeta(null);
      setClientLiveBilling(null);
      if (!userId) return;
      setMetaLoading(true);
      try {
        const meta = await admin.getUserBusinessMeta(userId);
        setUserMeta(meta);
        if (meta.accountId != null) {
          try {
            const bi = await admin.getAccountBillingInstruction(meta.accountId);
            setClientLiveBilling(bi);
          } catch {
            setClientLiveBilling(null);
          }
        }
      } catch {
        message.error(t("admin.editMetaLoadError"));
      } finally {
        setMetaLoading(false);
      }
    },
    [admin, message, t],
  );

  const importLiveBillingIntoForm = useCallback(() => {
    if (!clientLiveBilling) return;
    patchForm(formPatchFromBillingInstruction(clientLiveBilling));
    message.success(t("admin.payments.importClientBillingOk"));
  }, [clientLiveBilling, patchForm, message, t]);

  const loadTemplateIntoForm = useCallback(
    (tpl: InvoiceTemplateRow) => {
      patchForm(formPatchFromInvoiceTemplate(tpl));
      message.success(t("admin.payments.templateLoaded"));
    },
    [patchForm, message, t],
  );

  const presetBundle = useCallback(() => {
    patchForm({
      useBreakdown: true,
      lineItems: [
        { code: "server", label: t("admin.payments.lineServer"), amount: undefined },
        { code: "domain", label: t("admin.payments.lineDomain"), amount: undefined },
        { code: "tokens", label: t("admin.payments.lineTokens"), amount: undefined },
      ],
    });
  }, [patchForm, t]);

  const presetServerOnly = useCallback(() => {
    patchForm({
      useBreakdown: true,
      lineItems: [{ code: "server", label: t("admin.payments.lineServer"), amount: undefined }],
    });
  }, [patchForm, t]);

  // No useMemo: `form.watch` returns mutable live references, so memo deps would go stale.
  const linesRunningTotal = linesRunningTotalFromWatch(lineItemsW, useBreakdownW);

  const selectedUser = users.find((u) => String(u.id) === userIdW);
  const selectedIsAdmin = selectedUser?.role === "admin";
  const billBlockedForAdmin = Boolean(selectedIsAdmin && chargeTypeW && chargeTypeW !== "none");
  const canSaveTemplate = chargeTypeW === "one_time" || chargeTypeW === "monthly";

  return {
    form,
    userMeta,
    metaLoading,
    clientLiveBilling,
    setClientLiveBilling,
    userIdW,
    chargeTypeW,
    useBreakdownW,
    currencyW,
    onUserChange,
    importLiveBillingIntoForm,
    loadTemplateIntoForm,
    presetBundle,
    presetServerOnly,
    linesRunningTotal,
    selectedUser,
    selectedIsAdmin,
    billBlockedForAdmin,
    canSaveTemplate,
    refreshBillingFormForAccount,
  };
}
