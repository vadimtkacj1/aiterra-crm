import type { MutableRefObject } from "react";
import type { AdminService, BillingLineItem } from "@/services/admin/AdminService";
import type { MetaCampaignOption } from "@/services/analytics/meta/IMetaCampaignAnalyticsService";
import type { User } from "@/domain/User";
import type { UserBusinessMeta } from "@/services/admin/AdminService";
import type { UpdateUserInput } from "@/services/auth/IAuthService";
import type { AdminEditUserFormValues } from "./adminUsersTypes";

export type SubmitAdminUserEditResult = { ok: true } | { ok: false; reason: "billing_amount" };

export async function submitAdminUserEdit(params: {
  editUser: User;
  editMetaInfo: UserBusinessMeta;
  values: AdminEditUserFormValues;
  metaCampaigns: MetaCampaignOption[];
  services: { admin: AdminService };
  preservedBillingLinesRef: MutableRefObject<BillingLineItem[] | undefined>;
  updateUser: (userId: string, input: UpdateUserInput) => Promise<User>;
}): Promise<SubmitAdminUserEditResult> {
  const { editUser, editMetaInfo, values, metaCampaigns, services, preservedBillingLinesRef, updateUser } = params;

  await updateUser(String(editUser.id), {
    displayName: values.displayName,
    role: values.role,
  });

  if (editMetaInfo.accountId == null) {
    return { ok: true };
  }

  const withMeta = values.linkMeta === "with";
  const selected = withMeta ? metaCampaigns.find((c) => c.id === values.metaCampaignId) : undefined;
  await services.admin.setUserBusinessMeta(String(editUser.id), {
    metaCampaignId: withMeta && values.metaCampaignId ? values.metaCampaignId : null,
    metaCampaignName: withMeta && selected ? selected.name : null,
  });

  const withGoogle = values.linkGoogle === "with";
  await services.admin.setUserBusinessGoogle(String(editUser.id), {
    customerId: withGoogle ? (values.googleCustomerId?.trim() || null) : null,
    ...(withGoogle
      ? {
          developerToken: values.googleDeveloperToken?.trim() || undefined,
          refreshToken: values.googleRefreshToken?.trim() || undefined,
          loginCustomerId: values.googleLoginCustomerId?.trim() || null,
        }
      : {}),
  });

  await services.admin.setUserBusinessSite(String(editUser.id), {
    hasSite: values.linkSite,
    siteUrl: values.siteUrl?.trim() || null,
    notifyChannel: values.notifyChannel || null,
    waOwnerPhone: values.waOwnerPhone?.trim() || null,
    waNotifyMessage: values.waNotifyMessage?.trim() || null,
    emailNotifySubject: values.emailNotifySubject?.trim() || null,
    emailNotifyMessage: values.emailNotifyMessage?.trim() || null,
  });

  if (values.billingChargeType !== undefined) {
    const chargeType = values.billingChargeType ?? "none";
    const amt = values.billingAmount;
    const amount = chargeType === "none" ? null : typeof amt === "number" && amt > 0 ? amt : null;
    if (chargeType !== "none" && amount == null) {
      return { ok: false, reason: "billing_amount" };
    }

    let lineItems: BillingLineItem[] | undefined = preservedBillingLinesRef.current;
    if (lineItems?.length && amount != null) {
      const sum = Math.round(lineItems.reduce((s, x) => s + x.amount, 0) * 100) / 100;
      if (Math.abs(sum - amount) > 0.02) {
        lineItems = undefined;
      }
    }

    await services.admin.setAccountBillingInstruction(editMetaInfo.accountId, {
      chargeType,
      amount,
      currency: values.billingCurrency ?? "USD",
      description: values.billingDescription?.trim() || null,
      lineItems,
    });
  }

  return { ok: true };
}
