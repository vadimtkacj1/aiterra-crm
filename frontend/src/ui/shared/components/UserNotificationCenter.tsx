import { Bell, FileText, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { message } from "@/lib/toast";
import { useApp } from "../../../app/AppProviders";
import type { PendingPaymentAction } from "@/services/billing/IBillingService";
import { appLocaleFromLanguage, billingShell, formatInvoiceMoney } from "../../features/user/billing/components/billingUtils";
import type { CheckoutLocationState } from "@/ui/features/user/billing/checkout/checkoutTypes";
import { accountPath } from "../../navigation/paths";

function checkoutIntent(p: PendingPaymentAction): "savedCard" | "hosted" | null {
  if (p.payWithSavedCardAvailable) return "savedCard";
  if (p.payUrl) return "hosted";
  return null;
}

export function UserNotificationCenter({ accountId }: { accountId: string }) {
  const { services } = useApp();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingPaymentAction[]>([]);

  const locale = appLocaleFromLanguage(i18n.language ?? "en");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await services.billing.fetchOverview(accountId);
      setPending(data.pendingPayments ?? []);
    } catch {
      void message.error(t("layout.notifications.loadError"));
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [accountId, services, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void load();
  };

  const count = pending.length;

  const flowLabelsEqual = useMemo(() => {
    if (pending.length <= 1) return true;
    const f0 = pending[0]?.flow;
    return pending.every((x) => x.flow === f0);
  }, [pending]);

  const lineItemsContent = (p: PendingPaymentAction) => {
    const lines = p.lineItems ?? [];
    if (lines.length === 0) return null;
    return (
      <div className="max-w-75">
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.06em] text-(--ds-text-tertiary)">
          {t("billing.invoiceLinesHeading")}
        </span>
        {lines.map((li, idx) => (
          <div
            key={`${p.id}-li-${idx}`}
            className={
              "flex items-start justify-between gap-2.5 py-1.5" +
              (idx > 0 ? " border-t border-(--ds-border-subtle)" : "")
            }
          >
            <span className="min-w-0 flex-1 text-[13px] leading-[1.45] text-foreground">
              {li.label}
              {li.code ? (
                <span
                  className="ms-1.5 text-xs text-muted-foreground"
                  style={{ fontFamily: billingShell.mono }}
                >
                  ({li.code})
                </span>
              ) : null}
            </span>
            <span
              className="whitespace-nowrap text-[13px] font-medium tabular-nums"
              style={{ fontFamily: billingShell.mono }}
            >
              {formatInvoiceMoney(li.amount, p.currency, locale)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const goPay = (p: PendingPaymentAction) => {
    setOpen(false);
    const intent = checkoutIntent(p);
    if (intent) {
      const state: CheckoutLocationState = { payment: p, intent };
      navigate(`/a/${accountId}/billing/checkout`, { state });
    } else {
      navigate(accountPath(accountId, "billing"));
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-tour-target="header-notifications"
          aria-label={t("layout.notifications.tooltip")}
          className={
            "relative inline-flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
            (count > 0 && !loading ? "text-foreground" : "text-muted-foreground")
          }
        >
          <Bell className="size-4.5" aria-hidden="true" />
          {!loading && count > 0 ? (
            <span
              aria-hidden="true"
              className="absolute inset-e-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--ds-color-warning) px-1 text-[10px] font-semibold leading-none text-white tabular-nums"
            >
              {count}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-100 max-w-[calc(100vw-24px)] px-3.5 pb-3.5 pt-3"
      >
        <div className="flex flex-col">
          <div className="px-0.5 pb-2.5 pt-0.5">
            <span className="block text-[15px] font-semibold leading-[1.35] text-foreground">
              {t("layout.notifications.title")}
            </span>
            <span className="mt-1 block text-xs leading-[1.45] text-muted-foreground">
              {t("layout.notifications.subtitle")}
            </span>
          </div>

          {!loading && count > 0 ? <Separator className="mb-3" /> : null}

          {loading ? (
            <div className="flex items-center justify-center px-4 py-7">
              <Spinner size="sm" />
            </div>
          ) : count === 0 ? (
            <div className="flex flex-col items-center gap-2.5 rounded-lg border border-dashed border-(--ds-border-subtle) bg-(--ds-surface-1) px-4 pb-5 pt-6">
              <Bell className="size-7 text-(--ds-text-disabled)" aria-hidden="true" />
              <span className="text-center text-[13px] leading-[1.45] text-muted-foreground">
                {t("layout.notifications.empty")}
              </span>
              <span className="text-center text-xs leading-[1.45] text-muted-foreground">
                {t("layout.notifications.emptyHint")}
              </span>
            </div>
          ) : (
            <div className="flex max-h-100 flex-col gap-2.5 overflow-y-auto pe-1">
              {pending.map((p) => {
                const lines = p.lineItems ?? [];
                const hasLines = lines.length > 0;
                const intent = checkoutIntent(p);
                const primaryIsPay = intent !== null;
                const isMonthly = p.flow === "monthly";
                const FlowIcon = isMonthly ? RefreshCw : FileText;
                return (
                  <div
                    key={p.id}
                    className={
                      "min-w-0 rounded-lg border px-3.5 pb-3.5 pt-3 " +
                      (isMonthly
                        ? "border-(--ds-color-primary-surface-muted) bg-(--ds-color-primary-surface)"
                        : "border-(--ds-border-subtle) bg-(--ds-surface-1)")
                    }
                    style={{ boxShadow: billingShell.shadow }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <Badge variant="default" className="text-[11px]">
                              {t("layout.notifications.statusDue")}
                            </Badge>
                            {!flowLabelsEqual || pending.length === 1 ? (
                              <Badge
                                variant={isMonthly ? "processing" : "default"}
                                className="text-[11px] font-semibold uppercase tracking-[0.04em]"
                              >
                                {isMonthly ? t("billing.flowMonthlyShort") : t("billing.flowOneTimeShort")}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="flex items-start gap-2.5">
                            <FlowIcon
                              aria-hidden="true"
                              className={
                                "mt-0.75 size-4 shrink-0 " +
                                (isMonthly ? "text-(--ds-color-primary)" : "text-(--ds-color-info)")
                              }
                            />
                            <p className="m-0 wrap-break-word text-[13px] font-medium leading-normal text-foreground">
                              {p.summary}
                            </p>
                          </div>
                        </div>
                        <span
                          className="shrink-0 text-end text-[15px] font-semibold leading-[1.35] text-foreground tabular-nums"
                          style={{ fontFamily: billingShell.mono }}
                        >
                          {formatInvoiceMoney(p.amount, p.currency, locale)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="min-h-px">
                          {hasLines ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                                  {t("billing.pendingLineItemsTrigger", { count: lines.length })}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent side="bottom" className="w-auto">
                                {lineItemsContent(p)}
                              </PopoverContent>
                            </Popover>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {primaryIsPay ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setOpen(false);
                                navigate(accountPath(accountId, "billing"));
                              }}
                            >
                              {t("layout.notifications.openBilling")}
                            </Button>
                          ) : null}
                          <Button size="sm" className="font-semibold" onClick={() => goPay(p)}>
                            {primaryIsPay ? t("billing.payNow") : t("layout.notifications.openBilling")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
