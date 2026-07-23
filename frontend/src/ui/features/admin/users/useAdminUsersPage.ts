import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useApp } from "@/app/AppProviders";
import { confirm } from "@/lib/confirm";
import { message } from "@/lib/toast";
import type { BillingLineItem } from "@/services/admin/AdminService";
import type { MetaCampaignOption } from "@/services/analytics/meta/IMetaCampaignAnalyticsService";
import type { CreateUserInput } from "@/services/auth/IAuthService";
import type { User } from "@/domain/User";
import type { UserBusinessMeta, UserBusinessSite } from "@/services/admin/AdminService";
import {
  ADMIN_CREATE_USER_DEFAULTS,
  ADMIN_EDIT_USER_DEFAULTS,
  type AdminCreateUserFormValues,
  type AdminEditUserFormValues,
} from "./adminUsersTypes";
import { submitAdminUserEdit } from "./adminUsersEditSave";

export function useAdminUsersPage() {
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;

  const { services, users, usersLoading: loading, createUser, updateUser, resetPassword, refreshUsers } = useApp();
  const form = useForm<AdminCreateUserFormValues>({ defaultValues: { ...ADMIN_CREATE_USER_DEFAULTS } });
  const editForm = useForm<AdminEditUserFormValues>({ defaultValues: { ...ADMIN_EDIT_USER_DEFAULTS } });
  const pwdForm = useForm<{ password: string }>({ defaultValues: { password: "" } });
  /* Read during render so RHF tracks dirty state for the guarded close. */
  const createFormDirty = form.formState.isDirty;
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaignOption[]>([]);
  const [metaCampaignsLoading, setMetaCampaignsLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  /** Shown once after a successful create so the admin can hand the sign-in
      details to the client — the password is not retrievable afterwards. */
  const [createdCredentials, setCreatedCredentials] = useState<{ name: string; email: string; password: string } | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editMetaLoading, setEditMetaLoading] = useState(false);
  const [editMetaInfo, setEditMetaInfo] = useState<UserBusinessMeta | null>(null);
  const [editGoogleHasCredentials, setEditGoogleHasCredentials] = useState(false);
  const [editSiteInfo, setEditSiteInfo] = useState<UserBusinessSite | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const preservedBillingLinesRef = useRef<BillingLineItem[] | undefined>(undefined);

  const loadMetaCampaigns = useCallback(async () => {
    setMetaCampaignsLoading(true);
    try {
      const rows = await services.metaAnalytics.listAvailableCampaigns();
      setMetaCampaigns(rows);
    } catch {
      setMetaCampaigns([]);
      message.warning(tRef.current("admin.form.metaCampaignsLoadWarning"));
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
    /* Same effect as antd's resetFields + setFieldsValue: everything back to
       defaults, then the known user fields prefilled synchronously. */
    editForm.reset({
      ...ADMIN_EDIT_USER_DEFAULTS,
      displayName: u.displayName,
      role: u.role,
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
      setEditSiteInfo(sInfo);
      /* Async prefill patch — merge over the current values (antd
         setFieldsValue semantics), keeping the form pristine. */
      editForm.reset({
        ...editForm.getValues(),
        linkMeta: info.metaCampaignId ? "with" : "without",
        metaCampaignId: info.metaCampaignId ?? undefined,
        linkGoogle: gInfo.customerId ? "with" : "without",
        googleCustomerId: gInfo.customerId ?? undefined,
        googleLoginCustomerId: gInfo.loginCustomerId ?? undefined,
        googleDeveloperToken: undefined,
        googleRefreshToken: undefined,
        linkSite: sInfo.hasSite,
        siteUrl: sInfo.siteUrl ?? undefined,
        notifyChannel: sInfo.notifyChannel ?? "whatsapp",
        waNotifyMessage: sInfo.waNotifyMessage ?? undefined,
        emailNotifySubject: sInfo.emailNotifySubject ?? undefined,
        emailNotifyMessage: sInfo.emailNotifyMessage ?? undefined,
      });
      if (info.accountId != null) {
        try {
          const bi = await services.admin.getAccountBillingInstruction(info.accountId);
          preservedBillingLinesRef.current =
            bi.lineItems && bi.lineItems.length > 0 ? bi.lineItems.map((x) => ({ ...x })) : undefined;
          editForm.reset({
            ...editForm.getValues(),
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
      message.error(tRef.current("admin.editMetaLoadError"));
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
      setCreatedCredentials({ name: values.displayName, email: values.email, password: values.password });
      form.reset({ ...ADMIN_CREATE_USER_DEFAULTS });
      await loadMetaCampaigns();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("errors.generic"));
    }
  };

  const handleEditSave = async () => {
    if (!editUser || editMetaLoading || editMetaInfo === null) return;
    const valid = await editForm.trigger();
    if (!valid) return;
    try {
      const values = editForm.getValues();
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
    const valid = await pwdForm.trigger();
    if (!valid) return;
    try {
      const values = pwdForm.getValues();
      await resetPassword(String(resetUser.id), values.password);
      setResetUser(null);
      message.success(t("admin.passwordUpdated"));
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("errors.generic"));
    }
  };

  const openResetPassword = (u: User) => {
    setResetUser(u);
    pwdForm.reset({ password: "" });
  };

  const handleDeleteUser = async (u: User) => {
    confirm({
      title: t("admin.deleteUserConfirmTitle"),
      content: t("admin.deleteUserConfirmContent", { name: u.displayName || u.email }),
      okText: t("common.confirm"),
      cancelText: t("common.cancel"),
      danger: true,
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

  const handleDeleteBulk = async (ids: number[]) => {
    try {
      await Promise.all(ids.map((id) => services.admin.deleteUser(id)));
      message.success(t("admin.users.bulkDeleteSuccess", { count: ids.length }));
      await refreshUsers();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t("errors.generic"));
    }
  };

  /** Close the create modal; if the form has touched fields, confirm first. */
  const closeCreateGuarded = () => {
    if (!createFormDirty) {
      setCreateOpen(false);
      return;
    }
    confirm({
      title: t("admin.form.discardTitle"),
      content: t("admin.form.discardContent"),
      okText: t("common.confirm"),
      cancelText: t("common.cancel"),
      danger: true,
      onOk: () => {
        setCreateOpen(false);
        form.reset({ ...ADMIN_CREATE_USER_DEFAULTS });
      },
    });
  };

  return {
    t,
    services,
    form,
    handleDeleteBulk,
    metaCampaigns,
    metaCampaignsLoading,
    users,
    loading,
    createOpen,
    openCreate: () => setCreateOpen(true),
    closeCreate: closeCreateGuarded,
    createdCredentials,
    closeCreatedCredentials: () => setCreatedCredentials(null),
    handleCreateFinish,
    openEditUser,
    closeEditUser,
    editUser,
    editMetaLoading,
    editMetaInfo,
    editGoogleHasCredentials,
    editSiteInfo,
    setEditSiteInfo,
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
