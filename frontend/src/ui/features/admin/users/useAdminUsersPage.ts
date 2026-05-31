import { App, Form } from "antd";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/app/AppProviders";
import type { BillingLineItem } from "@/services/admin/AdminService";
import type { MetaCampaignOption } from "@/services/analytics/meta/IMetaCampaignAnalyticsService";
import type { CreateUserInput } from "@/services/auth/IAuthService";
import type { User } from "@/domain/User";
import type { UserBusinessMeta } from "@/services/admin/AdminService";
import type { AdminCreateUserFormValues, AdminEditUserFormValues } from "./adminUsersTypes";
import { submitAdminUserEdit } from "./adminUsersEditSave";

export function useAdminUsersPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const messageRef = useRef(message);
  const tRef = useRef(t);
  messageRef.current = message;
  tRef.current = t;

  const { services, users, usersLoading: loading, createUser, updateUser, resetPassword, refreshUsers } = useApp();
  const [form] = Form.useForm<AdminCreateUserFormValues>();
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaignOption[]>([]);
  const [metaCampaignsLoading, setMetaCampaignsLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editMetaLoading, setEditMetaLoading] = useState(false);
  const [editMetaInfo, setEditMetaInfo] = useState<UserBusinessMeta | null>(null);
  const [editGoogleHasCredentials, setEditGoogleHasCredentials] = useState(false);
  const [editForm] = Form.useForm<AdminEditUserFormValues>();
  const [pwdForm] = Form.useForm<{ password: string }>();
  const [resetUser, setResetUser] = useState<User | null>(null);
  const preservedBillingLinesRef = useRef<BillingLineItem[] | undefined>(undefined);

  const loadMetaCampaigns = useCallback(async () => {
    setMetaCampaignsLoading(true);
    try {
      const rows = await services.metaAnalytics.listAvailableCampaigns();
      setMetaCampaigns(rows);
    } catch {
      setMetaCampaigns([]);
      messageRef.current.warning(tRef.current("admin.form.metaCampaignsLoadWarning"));
    } finally {
      setMetaCampaignsLoading(false);
    }
  }, [services.metaAnalytics]);

  useEffect(() => {
    void loadMetaCampaigns();
  }, [loadMetaCampaigns]);

  const openEditUser = async (u: User) => {
    preservedBillingLinesRef.current = undefined;
    setEditUser(u);
    setEditMetaInfo(null);
    setEditGoogleHasCredentials(false);
    editForm.resetFields();
    editForm.setFieldsValue({
      displayName: u.displayName,
      role: u.role,
      linkMeta: "without",
      metaCampaignId: undefined,
      linkGoogle: "without",
      googleCustomerId: undefined,
      googleDeveloperToken: undefined,
      googleRefreshToken: undefined,
      googleLoginCustomerId: undefined,
      linkSite: false,
      siteUrl: undefined,
    });
    setEditMetaLoading(true);
    try {
      const [info, gInfo, sInfo] = await Promise.all([
        services.admin.getUserBusinessMeta(String(u.id)),
        services.admin.getUserBusinessGoogle(String(u.id)),
        services.admin.getUserBusinessSite(String(u.id)),
      ]);
      setEditMetaInfo(info);
      setEditGoogleHasCredentials(Boolean(gInfo.hasCredentials));
      editForm.setFieldsValue({
        linkMeta: info.metaCampaignId ? "with" : "without",
        metaCampaignId: info.metaCampaignId ?? undefined,
        linkGoogle: gInfo.customerId ? "with" : "without",
        googleCustomerId: gInfo.customerId ?? undefined,
        googleLoginCustomerId: gInfo.loginCustomerId ?? undefined,
        googleDeveloperToken: undefined,
        googleRefreshToken: undefined,
        linkSite: sInfo.hasSite,
        siteUrl: sInfo.siteUrl ?? undefined,
      });
      if (info.accountId != null) {
        try {
          const bi = await services.admin.getAccountBillingInstruction(info.accountId);
          preservedBillingLinesRef.current =
            bi.lineItems && bi.lineItems.length > 0 ? bi.lineItems.map((x) => ({ ...x })) : undefined;
          editForm.setFieldsValue({
            billingChargeType: bi.chargeType,
            billingAmount: bi.amount ?? undefined,
            billingCurrency: bi.currency || "USD",
            billingDescription: bi.description ?? undefined,
          });
        } catch {
          // billing load failed — leave fields unset so billing is skipped on save
        }
      }
    } catch {
      setEditMetaInfo({ accountId: null, metaCampaignId: null, metaCampaignName: null });
      setEditGoogleHasCredentials(false);
      messageRef.current.error(tRef.current("admin.editMetaLoadError"));
    } finally {
      setEditMetaLoading(false);
    }
  };

  const closeEditUser = () => {
    setEditUser(null);
    setEditMetaInfo(null);
    setEditGoogleHasCredentials(false);
  };

  const handleCreateFinish = async (values: AdminCreateUserFormValues) => {
    try {
      const withMeta = values.linkMeta === "with";
      const selected = withMeta ? metaCampaigns.find((c) => c.id === values.metaCampaignId) : undefined;
      const withGoogle = values.linkGoogle === "with";
      const withSite = values.linkSite;
      const payload: CreateUserInput = {
        email: values.email,
        password: values.password,
        displayName: values.displayName,
        role: values.role,
        phone: values.phone?.trim() || null,
        ...(withMeta && values.metaCampaignId
          ? { metaCampaignId: values.metaCampaignId, metaCampaignName: selected?.name }
          : {}),
        ...(withGoogle && values.googleCustomerId && values.googleDeveloperToken && values.googleRefreshToken
          ? {
              googleCustomerId: values.googleCustomerId,
              googleDeveloperToken: values.googleDeveloperToken,
              googleRefreshToken: values.googleRefreshToken,
              googleLoginCustomerId: values.googleLoginCustomerId,
            }
          : {}),
        withSite,
        siteUrl: withSite ? values.siteUrl?.trim() : undefined,
      };
      await createUser(payload);
      message.success(t("admin.createSuccess"));
      setCreateOpen(false);
      form.resetFields();
      form.setFieldsValue({ role: "user", linkMeta: "without", linkGoogle: "without", linkSite: false, siteUrl: undefined });
      await loadMetaCampaigns();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("errors.generic"));
    }
  };

  const handleEditSave = async () => {
    if (!editUser || editMetaLoading || editMetaInfo === null) return;
    try {
      const values = await editForm.validateFields();
      const result = await submitAdminUserEdit({
        editUser,
        editMetaInfo,
        values,
        metaCampaigns,
        services,
        preservedBillingLinesRef,
        updateUser,
      });
      if (!result.ok && result.reason === "billing_amount") {
        message.error(t("admin.form.billingAmountRequired"));
        return;
      }
      closeEditUser();
      message.success(t("admin.editSuccess"));
      await loadMetaCampaigns();
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) return;
      let msg = e instanceof Error ? e.message : t("errors.generic");
      if (axios.isAxiosError(e)) {
        const raw = e.response?.data as { detail?: unknown } | undefined;
        const d = typeof raw?.detail === "string" ? raw.detail : "";
        if (d) msg = d;
      }
      if (msg === "google_tokens_required") {
        message.error(t("admin.form.googleTokensRequired"));
        return;
      }
      message.error(msg);
    }
  };

  const handleResetPasswordSave = async () => {
    if (!resetUser) return;
    try {
      const values = await pwdForm.validateFields();
      await resetPassword(String(resetUser.id), values.password);
      setResetUser(null);
      message.success(t("admin.passwordUpdated"));
    } catch (e) {
      if (e && typeof e === "object" && "errorFields" in e) return;
      message.error(e instanceof Error ? e.message : t("errors.generic"));
    }
  };

  const openResetPassword = (u: User) => {
    setResetUser(u);
    pwdForm.resetFields();
  };

  const handleDeleteUser = async (u: User) => {
    const { Modal } = await import("antd");
    Modal.confirm({
      title: t("admin.deleteUserConfirmTitle"),
      content: t("admin.deleteUserConfirmContent", { name: u.displayName || u.email }),
      okText: t("common.confirm"),
      okType: "danger",
      cancelText: t("common.cancel"),
      onOk: async () => {
        try {
          await services.admin.deleteUser(Number(u.id));
          message.success(t("admin.userDeleted"));
          await refreshUsers();
        } catch (e) {
          message.error(e instanceof Error ? e.message : t("errors.generic"));
        }
      },
    });
  };

  return {
    t,
    form,
    metaCampaigns,
    metaCampaignsLoading,
    users,
    loading,
    createOpen,
    openCreate: () => setCreateOpen(true),
    closeCreate: () => setCreateOpen(false),
    handleCreateFinish,
    openEditUser,
    closeEditUser,
    editUser,
    editMetaLoading,
    editMetaInfo,
    editGoogleHasCredentials,
    editForm,
    handleEditSave,
    pwdForm,
    resetUser,
    openResetPassword,
    closeResetPassword: () => setResetUser(null),
    handleResetPasswordSave,
    handleDeleteUser,
  };
}
