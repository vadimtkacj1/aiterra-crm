import { App, Form, theme } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AccountBillingInstruction,
  BillingHistoryWithAccountRow,
  InvoiceTemplateCreateInput,
  InvoiceTemplateRow,
  UserBusinessMeta,
} from "../../../../../services/AdminService";
import { useApp } from "../../../../../app/AppProviders";
import { downloadInvoicePdf } from "../../../../shared/utils/invoicePdf";
import {
  buildInvoiceTemplatePayload,
  parseBillingInstructionFromSubmit,
  type FormMessage,
} from "./adminPaymentsFormModel";
import type { AdminPaymentsFormValues, LineFormRow } from "./types";

const SHELL_RADIUS = 16;
const SHELL_SHADOW = "0 1px 2px rgba(15,23,42,0.04), 0 10px 36px rgba(15,23,42,0.07)";

function showFormMessage(
  message: ReturnType<typeof App.useApp>["message"],
  t: (k: string) => string,
  m: FormMessage,
) {
  if (m.level === "warning") message.warning(t(m.key));
  else message.error(t(m.key));
}

export function useAdminPaymentsPage() {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { services, users, usersLoading: loadingUsers } = useApp();
  const [allBillingRows, setAllBillingRows] = useState<BillingHistoryWithAccountRow[]>([]);
  const [allBillingLoading, setAllBillingLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [invoiceTemplates, setInvoiceTemplates] = useState<InvoiceTemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [saveTemplateTitle, setSaveTemplateTitle] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [paymentLinkModal, setPaymentLinkModal] = useState<string | null>(null);
  const [form] = Form.useForm<AdminPaymentsFormValues>();

  const [userMeta, setUserMeta] = useState<UserBusinessMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [clientLiveBilling, setClientLiveBilling] = useState<AccountBillingInstruction | null>(null);

  const userIdW = Form.useWatch("userId", form);
  const lineItemsW = Form.useWatch("lineItems", form);
  const useBreakdownW = Form.useWatch("useBreakdown", form);
  const chargeTypeW = Form.useWatch("chargeType", form);
  const currencyW = Form.useWatch("currency", form) ?? "USD";

  const loadAllBillingHistory = useCallback(async () => {
    setAllBillingLoading(true);
    try {
      const rows = await services.admin.listAllBillingHistory();
      setAllBillingRows(rows);
    } catch {
      setAllBillingRows([]);
    } finally {
      setAllBillingLoading(false);
    }
  }, [services.admin]);

  const loadInvoiceTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const rows = await services.admin.listInvoiceTemplates();
      setInvoiceTemplates(rows);
    } catch {
      setInvoiceTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [services.admin]);

  useEffect(() => {
    void loadInvoiceTemplates();
  }, [loadInvoiceTemplates]);

  const buildTemplatePayloadFromForm = (): InvoiceTemplateCreateInput | null => {
    const values = form.getFieldsValue();
    const r = buildInvoiceTemplatePayload(values);
    if (!r.ok) {
      showFormMessage(message, t, r.message);
      return null;
    }
    return r.data;
  };

  const applyTemplateToSelectedClient = async (templateId: number) => {
    const accountId = userMeta?.accountId;
    if (accountId == null) {
      message.error(t("admin.payments.noBusiness"));
      return;
    }
    const picked = users.find((u) => String(u.id) === userIdW);
    if (picked?.role === "admin") {
      message.error(t("admin.payments.cannotBillAdmin"));
      return;
    }
    try {
      await services.admin.applyInvoiceTemplate(templateId, accountId);
      message.success(t("admin.payments.templateApplied"));
      const bi = await services.admin.getAccountBillingInstruction(accountId);
      setClientLiveBilling(bi);
      const hasLines = Boolean(bi.lineItems && bi.lineItems.length > 0);
      form.setFieldsValue({
        chargeType: bi.chargeType,
        amount: bi.amount ?? undefined,
        currency: bi.currency || "USD",
        description: bi.description ?? undefined,
        useBreakdown: hasLines || bi.chargeType === "none" ? hasLines : true,
        lineItems: hasLines
          ? bi.lineItems!.map((li) => ({
              code: li.code,
              label: li.label,
              amount: li.amount,
            }))
          : [],
      });
      await loadAllBillingHistory();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("errors.generic"));
    }
  };

  const loadTemplateIntoForm = (tpl: InvoiceTemplateRow) => {
    const hasLines = Boolean(tpl.lineItems && tpl.lineItems.length > 0);
    form.setFieldsValue({
      chargeType: tpl.chargeType,
      amount: hasLines ? undefined : tpl.amount,
      currency: tpl.currency || "USD",
      description: tpl.description ?? undefined,
      useBreakdown: hasLines,
      lineItems: hasLines
        ? tpl.lineItems!.map((li) => ({
            code: li.code ?? "",
            label: li.label,
            amount: li.amount,
          }))
        : [],
    });
    message.success(t("admin.payments.templateLoaded"));
  };

  const linesRunningTotal = useMemo(() => {
    if (!useBreakdownW || !Array.isArray(lineItemsW)) return null;
    const rows = lineItemsW.filter(
      (r: LineFormRow | undefined) =>
        r && String(r.label ?? "").trim() && r.amount != null && Number(r.amount) > 0,
    );
    if (!rows.length) return 0;
    return Math.round(rows.reduce((s, r) => s + Number(r!.amount), 0) * 100) / 100;
  }, [lineItemsW, useBreakdownW]);

  const onUserChange = async (userId: string) => {
    setUserMeta(null);
    setClientLiveBilling(null);
    if (!userId) return;
    setMetaLoading(true);
    try {
      const meta = await services.admin.getUserBusinessMeta(userId);
      setUserMeta(meta);
      if (meta.accountId != null) {
        try {
          const bi = await services.admin.getAccountBillingInstruction(meta.accountId);
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
  };

  const importLiveBillingIntoForm = () => {
    const bi = clientLiveBilling;
    if (!bi) return;
    const hasLines = Boolean(bi.lineItems && bi.lineItems.length > 0);
    form.setFieldsValue({
      chargeType: bi.chargeType,
      amount: bi.amount ?? undefined,
      currency: bi.currency || "USD",
      description: bi.description ?? undefined,
      useBreakdown: hasLines || bi.chargeType === "none" ? hasLines : true,
      lineItems: hasLines
        ? bi.lineItems!.map((li) => ({
            code: li.code,
            label: li.label,
            amount: li.amount,
          }))
        : [],
    });
    message.success(t("admin.payments.importClientBillingOk"));
  };

  const presetBundle = () => {
    form.setFieldsValue({
      useBreakdown: true,
      lineItems: [
        { code: "server", label: t("admin.payments.lineServer"), amount: undefined },
        { code: "domain", label: t("admin.payments.lineDomain"), amount: undefined },
        { code: "tokens", label: t("admin.payments.lineTokens"), amount: undefined },
      ],
    });
  };

  const presetServerOnly = () => {
    form.setFieldsValue({
      useBreakdown: true,
      lineItems: [{ code: "server", label: t("admin.payments.lineServer"), amount: undefined }],
    });
  };

  const selectedUser = users.find((u) => String(u.id) === userIdW);
  const selectedIsAdmin = selectedUser?.role === "admin";
  const billBlockedForAdmin = Boolean(selectedIsAdmin && chargeTypeW && chargeTypeW !== "none");
  const canSaveTemplate = chargeTypeW === "one_time" || chargeTypeW === "monthly";

  const openSaveTemplateModal = () => {
    const v = form.getFieldsValue();
    if (v.chargeType !== "one_time" && v.chargeType !== "monthly") {
      message.warning(t("admin.payments.templateNeedCharge"));
      return;
    }
    setSaveTemplateOpen(true);
  };

  const downloadRowPdf = (row: BillingHistoryWithAccountRow) => {
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
      note: "Downloaded from admin invoices list.",
    });
  };

  const onFormFinish = async (values: AdminPaymentsFormValues) => {
    if (!values.userId || String(values.userId).trim() === "") {
      message.error(t("admin.payments.selectUserRequired"));
      return;
    }
    const accountId = userMeta?.accountId;
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
      showFormMessage(message, t, parsed.message);
      return;
    }

    try {
      const result = await services.admin.setAccountBillingInstruction(accountId, {
        chargeType,
        amount: chargeType === "none" ? null : parsed.amount,
        currency: values.currency ?? "USD",
        description: values.description?.trim() || null,
        lineItems: parsed.lineItems,
      });
      if (chargeType !== "none") {
        const shareableUrl = result.paymentUrl?.startsWith("http")
          ? result.paymentUrl
          : `${window.location.origin}/a/${accountId}/billing/checkout`;
        setPaymentLinkModal(shareableUrl);
      } else {
        message.success(t("admin.payments.createdSuccess"));
      }
      try {
        const bi = await services.admin.getAccountBillingInstruction(accountId);
        setClientLiveBilling(bi);
        const hasLines = Boolean(bi.lineItems && bi.lineItems.length > 0);
        form.setFieldsValue({
          chargeType: bi.chargeType,
          amount: bi.amount ?? undefined,
          currency: bi.currency || "USD",
          description: bi.description ?? undefined,
          useBreakdown: hasLines || bi.chargeType === "none" ? hasLines : true,
          lineItems: hasLines
            ? bi.lineItems!.map((li) => ({
                code: li.code,
                label: li.label,
                amount: li.amount,
              }))
            : [],
        });
      } catch {
        /* ignore */
      }
      await loadAllBillingHistory();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("errors.generic"));
    }
  };

  const onSaveTemplateOk = async () => {
    setSavingTemplate(true);
    try {
      const payload = buildTemplatePayloadFromForm();
      if (!payload) {
        return Promise.reject(new Error("validation"));
      }
      await services.admin.createInvoiceTemplate({
        ...payload,
        title: saveTemplateTitle.trim() || null,
      });
      message.success(t("admin.payments.templateSaved"));
      setSaveTemplateOpen(false);
      setSaveTemplateTitle("");
      await loadInvoiceTemplates();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("errors.generic"));
      return Promise.reject(e);
    } finally {
      setSavingTemplate(false);
    }
  };

  return {
    t,
    token,
    message,
    services,
    users,
    loadingUsers,
    form,
    allBillingRows,
    allBillingLoading,
    revokingId,
    deletingId,
    setRevokingId,
    setDeletingId,
    invoiceTemplates,
    templatesLoading,
    saveTemplateOpen,
    setSaveTemplateOpen,
    saveTemplateTitle,
    setSaveTemplateTitle,
    savingTemplate,
    libraryOpen,
    setLibraryOpen,
    userMeta,
    metaLoading,
    clientLiveBilling,
    setClientLiveBilling,
    userIdW,
    chargeTypeW,
    useBreakdownW,
    currencyW,
    loadAllBillingHistory,
    loadInvoiceTemplates,
    applyTemplateToSelectedClient,
    loadTemplateIntoForm,
    linesRunningTotal,
    onUserChange,
    importLiveBillingIntoForm,
    presetBundle,
    presetServerOnly,
    selectedUser,
    selectedIsAdmin,
    billBlockedForAdmin,
    canSaveTemplate,
    openSaveTemplateModal,
    downloadRowPdf,
    onFormFinish,
    onSaveTemplateOk,
    shellRadius: SHELL_RADIUS,
    shellShadow: SHELL_SHADOW,
    paymentLinkModal,
    setPaymentLinkModal,
  };
}
