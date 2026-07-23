import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface InputNumberProps
  extends Omit<
    React.ComponentProps<"input">,
    "value" | "onChange" | "prefix" | "type" | "min" | "max" | "size"
  > {
  value: number | null;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Number of fraction digits enforced on blur. 0 disallows the decimal point. */
  precision?: number;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

function clampValue(v: number, min?: number, max?: number): number {
  let next = v;
  if (min != null && next < min) next = min;
  if (max != null && next > max) next = max;
  return next;
}

function formatValue(v: number | null, precision?: number): string {
  if (v == null || Number.isNaN(v)) return "";
  return precision != null ? v.toFixed(precision) : String(v);
}

function parseDraft(draft: string): number | null {
  if (draft === "" || draft === "-" || draft === "." || draft === "-.") return null;
  const parsed = Number(draft);
  return Number.isNaN(parsed) ? null : parsed;
}

const InputNumber = React.forwardRef<HTMLInputElement, InputNumberProps>(
  (
    {
      value,
      onChange,
      min,
      max,
      precision,
      prefix,
      suffix,
      className,
      onFocus,
      onBlur,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [draft, setDraft] = React.useState<string>(() => formatValue(value, precision));
    const [focused, setFocused] = React.useState(false);

    // Sync from the controlled value whenever the user is not typing.
    React.useEffect(() => {
      if (!focused) setDraft(formatValue(value, precision));
    }, [value, precision, focused]);

    const allowNegative = min == null || min < 0;
    const allowDecimal = precision == null || precision > 0;

    const draftPattern = React.useMemo(() => {
      let pattern = "^";
      if (allowNegative) pattern += "-?";
      pattern += "\\d*";
      if (allowDecimal) pattern += "(\\.\\d*)?";
      pattern += "$";
      return new RegExp(pattern);
    }, [allowNegative, allowDecimal]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      // Block anything that is not a (partial) number.
      if (!draftPattern.test(raw)) return;
      setDraft(raw);
      const parsed = parseDraft(raw);
      if (parsed !== value) onChange?.(parsed);
    };

    const commit = () => {
      const parsed = parseDraft(draft);
      if (parsed == null) {
        setDraft("");
        if (value !== null) onChange?.(null);
        return;
      }
      let next = clampValue(parsed, min, max);
      if (precision != null) next = Number(next.toFixed(precision));
      setDraft(formatValue(next, precision));
      if (next !== value) onChange?.(next);
    };

    return (
      // dir="ltr": numeric content (digits, minus sign, decimal point) must
      // render as an LTR island inside the RTL layout, otherwise "-12" shows
      // as "12-". Prefix/suffix follow the same island so adornment position
      // matches the input's logical padding.
      <div dir="ltr" data-slot="input-number" className={cn("relative w-full", className)}>
        {prefix != null && (
          <span
            data-slot="input-number-prefix"
            className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-sm text-muted-foreground"
          >
            {prefix}
          </span>
        )}
        <Input
          ref={ref}
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={draft}
          onChange={handleChange}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            commit();
            onBlur?.(event);
          }}
          className={cn("text-start", prefix != null && "ps-9", suffix != null && "pe-9")}
          {...props}
        />
        {suffix != null && (
          <span
            data-slot="input-number-suffix"
            className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3 text-sm text-muted-foreground"
          >
            {suffix}
          </span>
        )}
      </div>
    );
  },
);
InputNumber.displayName = "InputNumber";

export { InputNumber };
