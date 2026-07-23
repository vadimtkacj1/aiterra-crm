import {
  Calendar,
  CircleMinus,
  EllipsisVertical,
  FilePlus2,
  FileText,
  Info,
  Plus,
} from "lucide-react";
import type { TFunction } from "i18next";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputNumber } from "@/components/ui/input-number";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AdminPaymentsTokenLike } from "./adminPaymentsPageUi";
import { formatMoney } from "./billingUi";
import type { AdminPaymentsFormValues, BillingSchedule } from "./types";
import { BILLING_CURRENCIES } from "./types";

type Props = {
  t: TFunction;
  token: AdminPaymentsTokenLike;
  shellRadius: number;
  shellShadow: string;
  form: UseFormReturn<AdminPaymentsFormValues>;
  chargeTypeW: "none" | "one_time" | "monthly" | undefined;
  useBreakdownW: boolean | undefined;
  currencyW: string;
  linesRunningTotal: number | null;
  canSaveTemplate: boolean;
  openSaveTemplateModal: () => void;
  presetBundle: () => void;
  presetServerOnly: () => void;
};

type ChargeTypePickerProps = {
  value?: string;
  onChange?: (v: string) => void;
  t: TFunction;
};

function ChargeTypePicker({ value, onChange, t }: ChargeTypePickerProps) {
  const options = [
    {
      value: "one_time",
      icon: <FileText aria-hidden="true" className="size-6" />,
      label: t("admin.payments.chargeOneShort"),
      desc: t("admin.payments.chargeOneDesc"),
      color: "#1890ff",
    },
    {
      value: "monthly",
      icon: <Calendar aria-hidden="true" className="size-6" />,
      label: t("admin.payments.chargeMonthlyShort"),
      desc: t("admin.payments.chargeMonthlyDesc"),
      color: "#16a34a", // used in `${color}10` alpha concat below — must stay a literal hex
    },
  ];

  return (
    <div role="radiogroup" className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange?.(opt.value)}
            className="h-full w-full cursor-pointer rounded-lg p-5 text-start transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            style={{
              border: `2px solid ${selected ? opt.color : "var(--ds-border-default)"}`,
              background: selected ? `${opt.color}10` : "var(--ds-surface-0)",
            }}
          >
            <div
              className="mb-3 flex size-12 items-center justify-center rounded-lg"
              style={{
                background: selected ? opt.color : "var(--ds-surface-2)",
                color: selected ? "#fff" : "var(--ds-text-secondary)",
              }}
            >
              {opt.icon}
            </div>
            <div className="mb-1.5 text-base font-semibold text-foreground">{opt.label}</div>
            <div className="text-[13px] text-muted-foreground">{opt.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

function LabelHint({ hint }: { hint: string }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info tabIndex={0} className="size-3.5 shrink-0 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent className="max-w-72">{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Sentinel item for clearing the day selects (Radix Select has no allowClear). */
const CLEAR_DAY = "__none__";

export function InvoiceComposerCard({
  t,
  token,
  shellRadius,
  shellShadow,
  form,
  chargeTypeW,
  useBreakdownW,
  currencyW,
  linesRunningTotal,
  canSaveTemplate,
  openSaveTemplateModal,
  presetBundle,
  presetServerOnly,
}: Props) {
  const splitM = form.watch("splitAcrossMonths");
  const scheduleW = form.watch("billingSchedule") as BillingSchedule | undefined | null;
  const amtW = form.watch("amount");
  const billingDayW = form.watch("billingDay");
  const billingWeekDayW = form.watch("billingWeekDay");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lineItems" });

  const splitN = typeof splitM === "number" && splitM >= 2 ? Math.min(60, Math.floor(splitM)) : 0;
  const perPreview =
    chargeTypeW === "monthly" && splitN >= 2 && typeof amtW === "number" && amtW > 0
      ? Math.round((amtW / splitN) * 100) / 100
      : null;

  const sectionClass = "mt-5 border-t pt-5";
  const sectionStyle = { borderTopColor: "var(--ds-border-subtle)" };

  return (
    <div
      style={{
        borderRadius: shellRadius,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: shellShadow,
        background: token.colorBgContainer,
        padding: "20px 20px 24px",
      }}
    >
      {/* Rare actions behind disclosure: templates & presets */}
      <div className="mb-2 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("admin.payments.composerMenuLabel")}
              className="shrink-0"
            >
              <EllipsisVertical aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={!canSaveTemplate} onSelect={() => openSaveTemplateModal()}>
              <FilePlus2 aria-hidden="true" />
              {t("admin.payments.saveAsTemplate")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => presetBundle()}>
              {t("admin.payments.presetBundle")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => presetServerOnly()}>
              {t("admin.payments.presetServerOnly")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Charge type selection — stored string values preserved ("one_time" | "monthly") */}
      <div className="mb-5">
        <ChargeTypePicker
          value={chargeTypeW}
          onChange={(v) => form.setValue("chargeType", v as AdminPaymentsFormValues["chargeType"])}
          t={t}
        />
      </div>

      <Separator className="mb-4 mt-5" />

      {/* Pricing mode toggle */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-foreground">
          {t("admin.payments.sectionAmounts")}
        </span>
        <Segmented
          size="sm"
          value={useBreakdownW ? "on" : "off"}
          onChange={(v) => form.setValue("useBreakdown", v === "on")}
          options={[
            {
              value: "off",
              label: t("admin.payments.itemizedOff"),
              disabled: chargeTypeW === "monthly" && splitN >= 2,
            },
            {
              value: "on",
              label: t("admin.payments.itemizedOn"),
              disabled: chargeTypeW === "monthly" && splitN >= 2,
            },
          ]}
        />
      </div>

      {/* Single total */}
      {!useBreakdownW ? (
        <div className="mb-4 grid grid-cols-12 gap-x-3 gap-y-4">
          <div className="col-span-12 sm:col-span-7 md:col-span-6">
            <FormItem<AdminPaymentsFormValues, "amount">
              name="amount"
              label={
                chargeTypeW === "monthly" && splitN >= 2
                  ? t("admin.payments.splitContractTotalLabel")
                  : chargeTypeW === "monthly"
                    ? t("admin.payments.monthlyRecurringAmountLabel")
                    : t("admin.form.billingAmount")
              }
              rules={{
                required: t("admin.form.billingAmountRequired"),
                validate: (v) =>
                  v == null ||
                  (typeof v === "number" && v >= 0.01) ||
                  t("admin.form.billingAmountRequired"),
              }}
              hint={
                perPreview != null
                  ? t("admin.payments.splitPreviewHelp", {
                      perMonth: formatMoney(perPreview, currencyW),
                      months: splitN,
                      total: formatMoney(amtW as number, currencyW),
                    })
                  : undefined
              }
            >
              {(field, meta) => (
                <div className="flex gap-2">
                  <InputNumber
                    min={0.01}
                    precision={2}
                    value={typeof field.value === "number" ? field.value : null}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    aria-invalid={meta.invalid || undefined}
                    className="min-w-0 flex-1"
                  />
                  {/* antd `addonAfter` currency select — same stored string value */}
                  <Select value={currencyW} onValueChange={(v) => form.setValue("currency", v)}>
                    <SelectTrigger className="w-24 shrink-0" aria-label={t("admin.form.billingCurrency")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_CURRENCIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </FormItem>
          </div>
          {chargeTypeW === "monthly" ? (
            <div className="col-span-12 sm:col-span-5 md:col-span-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  {t("admin.payments.splitMonthsLabel")}
                  <LabelHint hint={t("admin.payments.splitMonthsHint")} />
                </Label>
                <InputNumber
                  min={2}
                  max={60}
                  precision={0}
                  placeholder={t("admin.payments.splitMonthsPlaceholder")}
                  value={typeof splitM === "number" ? splitM : null}
                  onChange={(v) => form.setValue("splitAcrossMonths", v ?? undefined)}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Billing schedule — monthly only, shown regardless of itemized/single-total */}
      {chargeTypeW === "monthly" ? (
        <div className={sectionClass} style={sectionStyle}>
          <span className="mb-2.5 block text-[13px] font-semibold text-foreground">
            {t("admin.payments.billingScheduleLabel")}
          </span>
          <RadioGroup
            value={scheduleW ?? ""}
            onValueChange={(v) => form.setValue("billingSchedule", v as BillingSchedule)}
            className="mb-2.5 flex flex-row flex-wrap gap-x-5 gap-y-2"
          >
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="monthly" />
              <span className="flex items-center gap-1">
                <Calendar aria-hidden="true" className="size-3.5" />
                {t("admin.payments.billingScheduleMonthly")}
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="weekly" />
              <span className="flex items-center gap-1">
                <Calendar aria-hidden="true" className="size-3.5" />
                {t("admin.payments.billingScheduleWeekly")}
              </span>
            </label>
          </RadioGroup>

          {/* Monthly → day of month */}
          {!scheduleW || scheduleW === "monthly" ? (
            <div className="max-w-55 space-y-1.5">
              <Label className="flex items-center gap-1.5">
                {t("admin.payments.billingDayLabel")}
                <LabelHint hint={t("admin.payments.billingDayHint")} />
              </Label>
              <Select
                value={billingDayW != null ? String(billingDayW) : ""}
                onValueChange={(v) =>
                  form.setValue("billingDay", v === CLEAR_DAY ? undefined : Number(v))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.payments.billingDayPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CLEAR_DAY} className="text-muted-foreground">
                    {t("admin.payments.billingDayPlaceholder")}
                  </SelectItem>
                  {Array.from({ length: 28 }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {String(i + 1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {/* Weekly → day of week */}
          {scheduleW === "weekly" ? (
            <div className="max-w-55 space-y-1.5">
              <Label>{t("admin.payments.billingWeekDayLabel")}</Label>
              <Select
                value={billingWeekDayW != null ? String(billingWeekDayW) : ""}
                onValueChange={(v) =>
                  form.setValue("billingWeekDay", v === CLEAR_DAY ? undefined : Number(v))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.payments.billingWeekDayPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CLEAR_DAY} className="text-muted-foreground">
                    {t("admin.payments.billingWeekDayPlaceholder")}
                  </SelectItem>
                  {WEEK_DAYS.map((d, i) => (
                    <SelectItem key={d} value={String(i)}>
                      {t(`admin.payments.weekDay.${d}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Itemized line items */}
      {useBreakdownW ? (
        <div className={`${sectionClass} mb-4`} style={sectionStyle}>
          <span className="mb-3 block text-xs text-muted-foreground">
            {t("admin.payments.linesHeading")}
          </span>

          <div className={`flex flex-col gap-1.5 ${fields.length > 0 ? "mb-2" : ""}`}>
            {fields.map((row, index) => (
              <div key={row.id} className="flex items-start gap-1.5">
                <FormItem<AdminPaymentsFormValues, `lineItems.${number}.label`>
                  name={`lineItems.${index}.label`}
                  rules={{ required: t("admin.payments.labelRequired") }}
                  className="min-w-0 flex-1"
                >
                  {(field, meta) => (
                    <Input
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-invalid={meta.invalid || undefined}
                      placeholder={t("admin.payments.colLabel")}
                    />
                  )}
                </FormItem>
                <FormItem<AdminPaymentsFormValues, `lineItems.${number}.amount`>
                  name={`lineItems.${index}.amount`}
                  rules={{ required: t("admin.payments.amountRequired") }}
                  className="w-32.5 shrink-0"
                >
                  {(field, meta) => (
                    <InputNumber
                      min={0.01}
                      precision={2}
                      value={typeof field.value === "number" ? field.value : null}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      aria-invalid={meta.invalid || undefined}
                      suffix={currencyW}
                    />
                  )}
                </FormItem>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("admin.payments.removeLine")}
                  onClick={() => remove(index)}
                  className="mt-px shrink-0 text-destructive hover:text-destructive"
                >
                  <CircleMinus aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => append({ code: undefined, label: "", amount: null })}
            className="w-full rounded-lg border-dashed"
          >
            <Plus aria-hidden="true" />
            {t("admin.payments.addLine")}
          </Button>

          {(linesRunningTotal ?? 0) > 0 ? (
            <div
              className="mt-3 flex justify-end border-t pt-2.5"
              style={{ borderTopColor: "var(--ds-border-subtle)" }}
            >
              <div className="flex flex-col items-end">
                <span className="text-[11px] text-muted-foreground">
                  {t("admin.payments.linesTotal")}
                </span>
                <span className="text-xl font-semibold tracking-[-0.02em] text-foreground tabular-nums">
                  {formatMoney(linesRunningTotal ?? 0, currencyW)}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Currency (itemized) + Description */}
      <div className="grid grid-cols-12 gap-x-4 gap-y-4">
        {useBreakdownW ? (
          <div className="col-span-12 sm:col-span-5 md:col-span-4">
            <FormItem<AdminPaymentsFormValues, "currency"> name="currency" label={t("admin.form.billingCurrency")}>
              {(field) => (
                <Select value={field.value ?? "USD"} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BILLING_CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormItem>
          </div>
        ) : null}
        <div className={useBreakdownW ? "col-span-12 sm:col-span-7 md:col-span-8" : "col-span-12"}>
          <FormItem<AdminPaymentsFormValues, "description">
            name="description"
            label={t("admin.form.billingDescription")}
          >
            {(field) => (
              <div>
                <Textarea
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t("admin.form.billingDescriptionPlaceholder")}
                  maxLength={500}
                  rows={2}
                  className="max-h-28 min-h-16"
                />
                <div className="mt-1 text-end text-xs text-muted-foreground tabular-nums">
                  {(field.value ?? "").length}/500
                </div>
              </div>
            )}
          </FormItem>
        </div>
      </div>
    </div>
  );
}
