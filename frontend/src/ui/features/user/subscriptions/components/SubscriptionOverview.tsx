import { Calendar, CircleCheck, CircleDollarSign } from "lucide-react";
import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import type { SubscriptionStatus } from "@/services/admin/AdminService";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { formatDate, formatMoney, getSubscriptionStatusColor } from "@/ui/shared/utils/subscriptionUtils";

interface Props {
  status: SubscriptionStatus;
  t: TFunction;
}

function DescriptionItem({ label, span2, children }: { label: ReactNode; span2?: boolean; children: ReactNode }) {
  return (
    <div className={span2 ? "bg-card p-3 sm:col-span-2" : "bg-card p-3"}>
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function SubscriptionOverview({ status, t }: Props) {
  const rawState = status.subscription_status;
  const subState = rawState === "canceled" ? "cancelled" : rawState;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
        <DescriptionItem label={t("admin.contracts.subscription.contractTitle")} span2>
          <span className="font-semibold">{status.contract_title}</span>
        </DescriptionItem>
        <DescriptionItem label={t("admin.contracts.subscription.monthlyAmount")}>
          <span className="text-base font-semibold tabular-nums">
            {formatMoney(status.monthly_amount, status.currency)}
          </span>
        </DescriptionItem>
        <DescriptionItem label={t("admin.contracts.subscription.duration")}>
          {status.subscription_months ? (
            <Badge variant="processing">
              {status.subscription_months} {t("admin.contracts.subscription.months")}
            </Badge>
          ) : (
            <Badge variant="primary">{t("admin.contracts.subscription.unlimited")}</Badge>
          )}
        </DescriptionItem>
        <DescriptionItem label={t("admin.contracts.subscription.startedAt")}>
          <span className="tabular-nums">{status.started_at ? formatDate(status.started_at) : "-"}</span>
        </DescriptionItem>
        <DescriptionItem label={t("admin.contracts.subscription.nextPayment")}>
          {status.next_payment_date ? (
            <Badge variant="success">
              <Calendar aria-hidden="true" />
              <span className="tabular-nums">{formatDate(status.next_payment_date)}</span>
            </Badge>
          ) : (
            "-"
          )}
        </DescriptionItem>
        <DescriptionItem label={t("admin.contracts.subscription.paymentsMade")}>
          <span className="flex items-center gap-2">
            <Badge variant="success">
              <CircleCheck aria-hidden="true" />
              {status.payments_made}
            </Badge>
            {status.payments_remaining !== null && (
              <span className="text-muted-foreground">
                / {status.payments_made + status.payments_remaining} {t("admin.contracts.subscription.total")}
              </span>
            )}
          </span>
        </DescriptionItem>
        <DescriptionItem label={t("admin.contracts.subscription.totalPaid")}>
          <span
            className="inline-flex items-center gap-1 text-base font-semibold tabular-nums"
            style={{ color: "var(--ds-color-success)" }}
          >
            <CircleDollarSign aria-hidden="true" className="size-4" />{" "}
            {formatMoney(status.total_paid, status.currency)}
          </span>
        </DescriptionItem>
        <DescriptionItem label={t("admin.contracts.subscription.subscriptionStatus")}>
          <Badge variant={getSubscriptionStatusColor(subState) as BadgeProps["variant"]}>
            {subState
              ? t(`admin.contracts.subscription.state${subState.charAt(0).toUpperCase()}${subState.slice(1)}`, {
                  defaultValue: t("admin.contracts.subscription.stateUnknown"),
                })
              : t("admin.contracts.subscription.stateUnknown")}
          </Badge>
        </DescriptionItem>
      </div>
    </div>
  );
}
