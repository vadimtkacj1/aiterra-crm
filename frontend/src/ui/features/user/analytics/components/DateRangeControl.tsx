import { format as formatDate, subDays } from "date-fns";
import { CalendarRange } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { MenuDropdown } from "@/components/ui/menu-compat";
import { cn } from "@/lib/utils";

export type DateRange = [Date | null, Date | null] | null;

/** Serialize a range boundary for the analytics API (matches the old dayjs "YYYY-MM-DD"). */
export function rangeParam(d: Date | null | undefined): string | undefined {
  return d ? formatDate(d, "yyyy-MM-dd") : undefined;
}

interface DateRangeControlProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  className?: string;
}

/**
 * Replacement for the antd RangePicker on the analytics screens:
 * two date fields (since / until) plus a presets dropdown (last 7/30/90 days).
 * Rendered LTR so the date order stays stable in Hebrew, like the original.
 */
export function DateRangeControl({ value, onChange, className }: DateRangeControlProps) {
  const { t } = useTranslation();
  const displayFormat = (d: Date) => formatDate(d, "yyyy-MM-dd");

  const setPreset = (days: number) => {
    onChange([subDays(new Date(), days - 1), new Date()]);
  };

  return (
    <div dir="ltr" className={cn("flex items-center gap-1", className)}>
      <DatePicker
        value={value?.[0] ?? null}
        onChange={(d) => onChange([d, value?.[1] ?? null])}
        format={displayFormat}
        placeholder={t("analytics.period.startDate", { defaultValue: "Start date" })}
        clearable
        clearLabel={t("common.clear", { defaultValue: "Clear" })}
        className="w-[130px]"
      />
      <span className="text-muted-foreground">–</span>
      <DatePicker
        value={value?.[1] ?? null}
        onChange={(d) => onChange([value?.[0] ?? null, d])}
        format={displayFormat}
        placeholder={t("analytics.period.endDate", { defaultValue: "End date" })}
        clearable
        clearLabel={t("common.clear", { defaultValue: "Clear" })}
        className="w-[130px]"
      />
      <MenuDropdown
        align="end"
        items={[
          { key: "7", label: t("analytics.period.last7Days"), onClick: () => setPreset(7) },
          { key: "30", label: t("analytics.period.last30Days"), onClick: () => setPreset(30) },
          { key: "90", label: t("analytics.period.last90Days"), onClick: () => setPreset(90) },
        ]}
      >
        <Button
          variant="outline"
          size="icon"
          aria-label={t("analytics.period.presets", { defaultValue: "Date presets" })}
        >
          <CalendarRange aria-hidden="true" />
        </Button>
      </MenuDropdown>
    </div>
  );
}
