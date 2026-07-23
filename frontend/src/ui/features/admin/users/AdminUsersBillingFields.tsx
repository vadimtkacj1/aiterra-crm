import { useWatch, type UseFormReturn } from "react-hook-form";
import type { TFunction } from "i18next";
import { FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputNumber } from "@/components/ui/input-number";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BILLING_CURRENCIES } from "@/ui/features/admin/payments/types";
import type { AdminEditUserFormValues } from "./adminUsersTypes";

type Props = {
  t: TFunction;
  form: UseFormReturn<AdminEditUserFormValues>;
};

export function AdminUsersBillingFields({ t, form }: Props) {
  const chargeType = useWatch({ control: form.control, name: "billingChargeType" });

  return (
    <div className="space-y-5">
      <div className="my-4 flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        {t("admin.form.billingInstructionSection")}
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>

      <FormItem<AdminEditUserFormValues, "billingChargeType">
        name="billingChargeType"
        label={t("admin.form.billingChargeType")}
        rules={{ required: t("form.validation.required") }}
      >
        {(field) => (
          <RadioGroup value={field.value ?? ""} onValueChange={field.onChange} className="gap-2.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="none" />
              {t("admin.form.billingTypeNone")}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="one_time" />
              {t("admin.form.billingTypeOneTime")}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <RadioGroupItem value="monthly" />
              {t("admin.form.billingTypeMonthly")}
            </label>
          </RadioGroup>
        )}
      </FormItem>

      {chargeType !== "none" && (
        <>
          <FormItem<AdminEditUserFormValues, "billingAmount">
            name="billingAmount"
            label={t("admin.form.billingAmount")}
            rules={{
              required: t("admin.form.billingAmountRequired"),
              validate: (v) =>
                (typeof v === "number" && v >= 0.01) || t("admin.form.billingAmountRequired"),
            }}
          >
            {(field) => (
              <InputNumber
                value={typeof field.value === "number" ? field.value : null}
                onChange={(v) => field.onChange(v)}
                onBlur={field.onBlur}
                min={0.01}
                precision={2}
                className="tabular-nums"
                placeholder={t("admin.form.billingAmountPlaceholder")}
              />
            )}
          </FormItem>
          <FormItem<AdminEditUserFormValues, "billingCurrency">
            name="billingCurrency"
            label={t("admin.form.billingCurrency")}
          >
            {(field) => (
              <Select value={field.value ?? undefined} onValueChange={field.onChange}>
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
          <FormItem<AdminEditUserFormValues, "billingDescription">
            name="billingDescription"
            label={t("admin.form.billingDescription")}
          >
            {(field) => (
              <Input
                {...field}
                value={field.value ?? ""}
                placeholder={t("admin.form.billingDescriptionPlaceholder")}
              />
            )}
          </FormItem>
        </>
      )}
    </div>
  );
}
