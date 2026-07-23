import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/app/AppProviders";
import { message } from "@/lib/toast";
import type { BillingHistoryWithAccountRow, InvoiceTemplateCreateInput } from "@/services/admin/AdminService";
import { downloadInvoicePdf } from "@/ui/shared/utils/invoicePdf";
import {
  buildInvoiceTemplatePayload,
  parseBillingInstructionFromSubmit,
} from "./adminPaymentsFormModel";
import { showAdminPaymentsFormMessage } from "./adminPaymentsPageUi";
import type { AdminPaymentsLibraryDrawerModel } from "./adminPaymentsLibraryTypes";
import type { AdminPaymentsFormValues } from "./types";
import { ADMIN_PAYMENTS_FORM_DEFAULTS, useAdminPaymentsComposerSession } from "./useAdminPaymentsComposerSession";
import { useAdminPaymentsRemoteLists } from "./useAdminPaymentsRemoteLists";

export function useAdminPaymentsPage() {
  const { t } = useTranslation();
  const { services, users, usersLoading: loadingUsers } = useApp();

  const lists = useAdminPaymentsRemoteLists(services.admin);
  const session = useAdminPaymentsComposerSession(t, services.admin, message, users);

  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [saveTemplateTitle, setSaveTemplateTitle] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const visibleBillingRows = useMemo(
    () =>
      session.userMeta?.accountId != null
        ? lists.allBillingRows.filter((r) => r.accountId === session.userMeta!.accountId)
        : lists.allBillingRows,
    [lists.allBillingRows, session.userMeta?.accountId],
  );

  const buildTemplatePayloadFromForm = (): InvoiceTemplateCreateInput | null => {
    const values = session.form.getValues();
    const r = buildInvoiceTemplatePayload(values);
    if (!r.ok) {
      showAdminPaymentsFormMessage(message, t, r.message);
      return null;
    }
    return r.data;
  };

  const applyTemplateToSelectedClient = async (templateId: number) => {
    const accountId = session.userMeta?.accountId;
    if (accountId == null) {
      message.error(t("admin.payments.noBusiness"));
      return;
    }
    const picked = users.find((u) => String(u.id) === session.userIdW);
    if (picked?.role === "admin") {
      message.error(t("admin.payments.cannotBillAdmin"));
      return;
    }
    try {
      await services.admin.applyInvoiceTemplate(templateId, accountId);
      message.success(t("admin.payments.templateApplied"));
      await session.refreshBillingFormForAccount(accountId);
      await lists.loadAllBillingHistory();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("errors.generic"));
    }
  };

  const openSaveTemplateModal = () => {
    const v = session.form.getValues();
    if (v.chargeType !== "one_time" && v.chargeType !== "monthly") {
      message.warning(t("admin.payments.templateNeedCharge"));
      return;
    }
    setSaveTemplateOpen(true);
  };

  const downloadRowPdf = useCallback(
    (row: BillingHistoryWithAccountRow) => {
      const amt = row.amount ?? 0;
      downloadInvoicePdf({
        invoiceId: `admin_hist_${row.accountId}_${row.id}`,
        amount: amt,
        currency: row.currency,
        status: row.paymentStatus,
        description: row.description,
        chargeType: row.chargeType,
        accountId: row.accountId,
        customerName: row.ownerEmail || row.accountName || undefined,
        lineItems: row.lineItems?.map((li) => ({ code: li.code ?? "", label: li.label, amount: li.amount })),
        createdAt: row.createdAt,
        installmentMonths: row.installmentMonths ?? undefined,
        installmentTotalAmount: row.installmentTotalAmount ?? undefined,
        note: "Downloaded from admin invoices list.",
      });
    },
    [],
  );

  const onFormFinish = async (values: AdminPaymentsFormValues) => {
    if (!values.userId || String(values.userId).trim() === "") {
      message.error(t("admin.payments.selectUserRequired"));
      return;
    }
    const accountId = session.userMeta?.accountId;
    if (accountId == null) {
      message.error(t("admin.payments.noBusiness"));
      return;
    }
    const chargeType = values.chargeType;
    const picked = users.find((u) => String(u.id) === String(values.userId));
    if (chargeType !== "none" && picked?.role === "admin") {
      message.error(t("admin.payments.cannotBillAdmin"));
      return;
    }

    const parsed = parseBillingInstructionFromSubmit(values);
    if (!parsed.ok) {
      showAdminPaymentsFormMessage(message, t, parsed.message);
      return;
    }

    try {
      const schedule = values.billingSchedule;
      await services.admin.setAccountBillingInstruction(accountId, {
        chargeType,
        amount: chargeType === "none" ? null : parsed.amount,
        currency: values.currency ?? "USD",
        description: values.description?.trim() || null,
        lineItems: parsed.lineItems,
        splitAcrossMonths: parsed.splitAcrossMonths ?? null,
        billingDay: chargeType === "monthly" && (!schedule || schedule === "monthly") ? (values.billingDay ?? null) : null,
        billingWeekDay: chargeType === "monthly" && schedule === "weekly" ? (values.billingWeekDay ?? null) : null,
        testIntervalMinutes: chargeType === "monthly" && schedule === "minutely" ? (values.testIntervalMinutes ?? null) : null,
      });
      message.success(t("admin.payments.createdSuccess"));
      // antd `resetFields()` + `setFieldsValue({chargeType:"none", currency:"USD", ...})` equivalent.
      session.form.reset({
        ...ADMIN_PAYMENTS_FORM_DEFAULTS,
        chargeType: "none",
        currency: "USD",
      });
      await session.onUserChange("");
      await lists.loadAllBillingHistory();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("errors.generic"));
    }
  };

  const onSaveTemplateOk = async () => {
    setSavingTemplate(true);
    try {
      const payload = buildTemplatePayloadFromForm();
      if (!payload) {
        return; // validation message already shown; keep the modal open
      }
      await services.admin.createInvoiceTemplate({
        ...payload,
        title: saveTemplateTitle.trim() || null,
      });
      message.success(t("admin.payments.templateSaved"));
      setSaveTemplateOpen(false);
      setSaveTemplateTitle("");
      await lists.loadInvoiceTemplates();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("errors.generic"));
    } finally {
      setSavingTemplate(false);
    }
  };

  const libraryDrawer: AdminPaymentsLibraryDrawerModel = {
    t,
    open: libraryOpen,
    onClose: () => setLibraryOpen(false),
    afterOpenChange: (open) => {
      if (open) void lists.loadAllBillingHistory();
    },
    admin: services.admin,
    message,
    userMeta: session.userMeta,
    allBillingRows: lists.allBillingRows,
    allBillingLoading: lists.allBillingLoading,
    revokingId,
    deletingId,
    setRevokingId,
    setDeletingId,
    refreshBillingFormForAccount: session.refreshBillingFormForAccount,
    loadAllBillingHistory: lists.loadAllBillingHistory,
    downloadRowPdf,
    invoiceTemplates: lists.invoiceTemplates,
    templatesLoading: lists.templatesLoading,
    billBlockedForAdmin: session.billBlockedForAdmin,
    loadTemplateIntoForm: session.loadTemplateIntoForm,
    applyTemplateToSelectedClient,
    loadInvoiceTemplates: lists.loadInvoiceTemplates,
  };

  return {
    t,
    message,
    services,
    users,
    loadingUsers,
    form: session.form,
    allBillingRows: lists.allBillingRows,
    visibleBillingRows,
    allBillingLoading: lists.allBillingLoading,
    revokingId,
    deletingId,
    setRevokingId,
    setDeletingId,
    invoiceTemplates: lists.invoiceTemplates,
    templatesLoading: lists.templatesLoading,
    saveTemplateOpen,
    setSaveTemplateOpen,
    saveTemplateTitle,
    setSaveTemplateTitle,
    savingTemplate,
    libraryOpen,
    setLibraryOpen,
    userMeta: session.userMeta,
    metaLoading: session.metaLoading,
    clientLiveBilling: session.clientLiveBilling,
    setClientLiveBilling: session.setClientLiveBilling,
    userIdW: session.userIdW,
    chargeTypeW: session.chargeTypeW,
    useBreakdownW: session.useBreakdownW,
    currencyW: session.currencyW,
    loadAllBillingHistory: lists.loadAllBillingHistory,
    loadInvoiceTemplates: lists.loadInvoiceTemplates,
    applyTemplateToSelectedClient,
    loadTemplateIntoForm: session.loadTemplateIntoForm,
    linesRunningTotal: session.linesRunningTotal,
    onUserChange: session.onUserChange,
    importLiveBillingIntoForm: session.importLiveBillingIntoForm,
    presetBundle: session.presetBundle,
    presetServerOnly: session.presetServerOnly,
    selectedUser: session.selectedUser,
    selectedIsAdmin: session.selectedIsAdmin,
    billBlockedForAdmin: session.billBlockedForAdmin,
    canSaveTemplate: session.canSaveTemplate,
    openSaveTemplateModal,
    refreshBillingFormForAccount: session.refreshBillingFormForAccount,
    downloadRowPdf,
    onFormFinish,
    onSaveTemplateOk,
    libraryDrawer,
  };
}
