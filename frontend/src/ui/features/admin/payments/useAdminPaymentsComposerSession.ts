import { Form } from "antd";
import type { App } from "antd";
import type { TFunction } from "i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AccountBillingInstruction, AdminService, InvoiceTemplateRow, UserBusinessMeta } from "@/services/admin/AdminService";
import type { User } from "@/domain/User";
import { formPatchFromBillingInstruction, formPatchFromInvoiceTemplate, linesRunningTotalFromWatch } from "./adminPaymentsFormBinding";
import type { AdminPaymentsFormValues } from "./types";

type MessageApi = ReturnType<typeof App.useApp>["message"];

export function useAdminPaymentsComposerSession(
  t: TFunction,
  admin: AdminService,
  message: MessageApi,
  users: User[],
) {
  const [form] = Form.useForm<AdminPaymentsFormValues>();
  const [userMeta, setUserMeta] = useState<UserBusinessMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [clientLiveBilling, setClientLiveBilling] = useState<AccountBillingInstruction | null>(null);

  const userIdW = Form.useWatch("userId", form);
  const lineItemsW = Form.useWatch("lineItems", form);
  const useBreakdownW = Form.useWatch("useBreakdown", form);
  const chargeTypeW = Form.useWatch("chargeType", form);
  const splitAcrossMonthsW = Form.useWatch("splitAcrossMonths", form);
  const currencyW = Form.useWatch("currency", form) ?? "USD";

  useEffect(() => {
    if (chargeTypeW !== "monthly") {
      form.setFieldsValue({ splitAcrossMonths: undefined, billingDay: undefined });
    }
  }, [chargeTypeW, form]);

  useEffect(() => {
    const n = typeof splitAcrossMonthsW === "number" ? splitAcrossMonthsW : 0;
    if (chargeTypeW === "monthly" && n >= 2 && useBreakdownW) {
      form.setFieldsValue({ useBreakdown: false, lineItems: [] });
    }
  }, [chargeTypeW, splitAcrossMonthsW, useBreakdownW, form]);

  const refreshBillingFormForAccount = useCallback(
    async (accountId: number) => {
      try {
        const bi = await admin.getAccountBillingInstruction(accountId);
        setClientLiveBilling(bi);
        form.setFieldsValue(formPatchFromBillingInstruction(bi));
      } catch {
        /* ignore */
      }
    },
    [admin, form],
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
    form.setFieldsValue(formPatchFromBillingInstruction(clientLiveBilling));
    message.success(t("admin.payments.importClientBillingOk"));
  }, [clientLiveBilling, form, message, t]);

  const loadTemplateIntoForm = useCallback(
    (tpl: InvoiceTemplateRow) => {
      form.setFieldsValue(formPatchFromInvoiceTemplate(tpl));
      message.success(t("admin.payments.templateLoaded"));
    },
    [form, message, t],
  );

  const presetBundle = useCallback(() => {
    form.setFieldsValue({
      useBreakdown: true,
      lineItems: [
        { code: "server", label: t("admin.payments.lineServer"), amount: undefined },
        { code: "domain", label: t("admin.payments.lineDomain"), amount: undefined },
        { code: "tokens", label: t("admin.payments.lineTokens"), amount: undefined },
      ],
    });
  }, [form, t]);

  const presetServerOnly = useCallback(() => {
    form.setFieldsValue({
      useBreakdown: true,
      lineItems: [{ code: "server", label: t("admin.payments.lineServer"), amount: undefined }],
    });
  }, [form, t]);

  const linesRunningTotal = useMemo(
    () => linesRunningTotalFromWatch(lineItemsW, useBreakdownW),
    [lineItemsW, useBreakdownW],
  );

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
