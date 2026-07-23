import * as React from "react";
import { format as formatDate } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const defaultFormat = (d: Date) => formatDate(d, "dd/MM/yyyy");

export interface DatePickerProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  /** Formats the selected date for display. Defaults to dd/MM/yyyy. */
  format?: (d: Date) => string;
  placeholder?: React.ReactNode;
  disabled?: boolean;
  /** Shows a clear affordance when a date is selected. */
  clearable?: boolean;
  /** Accessible label for the clear affordance (required for a11y when clearable). */
  clearLabel?: string;
  className?: string;
  id?: string;
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      value,
      onChange,
      format = defaultFormat,
      placeholder,
      disabled,
      clearable,
      clearLabel,
      className,
      id,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const handleSelect = (date: Date | undefined) => {
      onChange?.(date ?? null);
      setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onChange?.(null);
    };

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={ref}
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            data-slot="date-picker-trigger"
            className={cn(
              "w-full justify-start border-input text-start font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          >
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1 truncate text-start">
              {value ? format(value) : placeholder}
            </span>
            {clearable && value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label={clearLabel}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange?.(null);
                  }
                }}
                className={cn(
                  "-me-1 ms-auto flex size-5 shrink-0 items-center justify-center rounded-md",
                  "text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                )}
              >
                <X className="size-3.5" aria-hidden="true" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            defaultMonth={value ?? undefined}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
    );
  },
);
DatePicker.displayName = "DatePicker";

export { DatePicker };
