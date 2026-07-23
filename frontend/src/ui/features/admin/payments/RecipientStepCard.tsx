import { DollarSign } from "lucide-react";
import type { TFunction } from "i18next";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { FormItem } from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import type { User } from "@/domain/User";
import type { AccountBillingInstruction, UserBusinessMeta } from "@/services/admin/AdminService";
import type { AdminPaymentsFormValues } from "./types";

type Props = {
  t: TFunction;
  loadingUsers: boolean;
  users: User[];
  onUserChange: (userId: string) => void | Promise<void>;
  selectedIsAdmin: boolean;
  selectedUser: User | undefined;
  userMeta: UserBusinessMeta | null;
  metaLoading: boolean;
  clientLiveBilling: AccountBillingInstruction | null;
  importLiveBillingIntoForm: () => void;
};

export function RecipientStepCard({
  t,
  loadingUsers,
  users,
  onUserChange,
  selectedIsAdmin,
  selectedUser,
  userMeta,
  metaLoading,
  clientLiveBilling,
  importLiveBillingIntoForm,
}: Props) {
  return (
    <Card className="p-6">
      <div className="flex w-full flex-col gap-5">
        {/* User Selection — label omitted: the placeholder already names it */}
        <FormItem<AdminPaymentsFormValues, "userId"> name="userId" className="max-w-160">
          {(field) => (
            <Combobox
              value={field.value || null}
              onChange={(v) => {
                const next = v ?? "";
                field.onChange(next);
                void onUserChange(next);
              }}
              clearable
              loading={loadingUsers}
              placeholder={t("admin.payments.selectClientPlaceholder")}
              searchPlaceholder={t("admin.payments.selectClientPlaceholder")}
              emptyText={t("common.noData")}
              options={users.map((u) => {
                const name = u.displayName?.trim();
                // Visible label: name + email only; phone/role/#id stay searchable via `search`.
                return {
                  value: String(u.id),
                  search: [
                    u.displayName,
                    u.email,
                    u.phone,
                    u.role === "admin" ? t("admin.roles.admin") : "",
                    `#${u.id}`,
                  ]
                    .filter(Boolean)
                    .join(" "),
                  label: name ? `${name} · ${u.email}` : u.email,
                };
              })}
            />
          )}
        </FormItem>

        {/* Admin Warning */}
        {selectedIsAdmin && (
          <Alert
            variant="warning"
            title={t("admin.payments.adminSelectedWarning")}
            description={t("admin.payments.adminSelectedWarningDesc")}
          />
        )}

        {/* Selected User Info */}
        {selectedUser && !selectedIsAdmin && (
          <div className="relative">
            {metaLoading ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/60">
                <Spinner aria-hidden="true" />
              </div>
            ) : null}
            <div className="pt-5" style={{ borderTop: "1px solid var(--ds-border-subtle)" }}>
              <dl className="m-0 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-muted-foreground">{t("admin.payments.clientName")}:</dt>
                <dd className="m-0 font-semibold text-foreground">
                  {selectedUser.displayName || selectedUser.email}
                </dd>
                <dt className="text-muted-foreground">{t("admin.payments.clientEmail")}:</dt>
                <dd className="m-0">{selectedUser.email}</dd>
                <dt className="text-muted-foreground">{t("admin.payments.accountId")}:</dt>
                <dd className="m-0">
                  {userMeta?.accountId ? (
                    <Badge variant="primary">#{userMeta.accountId}</Badge>
                  ) : (
                    <Badge variant="default">{t("admin.payments.noAccount")}</Badge>
                  )}
                </dd>
                {userMeta?.metaCampaignId && (
                  <>
                    <dt className="text-muted-foreground">{t("admin.payments.metaCampaign")}:</dt>
                    <dd className="m-0">
                      <Badge variant="success">{userMeta.metaCampaignId}</Badge>
                    </dd>
                  </>
                )}
              </dl>

              {/* Live Billing Import */}
              {clientLiveBilling && (clientLiveBilling.chargeType === "one_time" || clientLiveBilling.chargeType === "monthly") && (
                <Alert
                  variant="info"
                  icon={<DollarSign aria-hidden="true" />}
                  className="mt-4"
                  title={t("admin.payments.liveBillingDetected")}
                  description={
                    <div className="flex w-full flex-col items-start gap-2">
                      <span>
                        {t("admin.payments.liveBillingAmount", {
                          amount: clientLiveBilling.amount?.toFixed(2) || "0.00",
                          currency: clientLiveBilling.currency || "USD",
                        })}
                      </span>
                      <Button type="button" variant="outline" size="sm" onClick={importLiveBillingIntoForm}>
                        {t("admin.payments.importLiveBilling")}
                      </Button>
                    </div>
                  }
                />
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
