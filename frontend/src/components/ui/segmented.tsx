import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption {
  label: React.ReactNode;
  value: string;
  disabled?: boolean;
}

export interface SegmentedProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  options: SegmentedOption[];
  value: string;
  onChange?: (value: string) => void;
  size?: "sm" | "default" | "lg";
}

const sizeClasses: Record<NonNullable<SegmentedProps["size"]>, string> = {
  sm: "h-7 px-2.5 text-xs",
  default: "h-8 px-3 text-sm",
  lg: "h-10 px-4 text-sm",
};

const Segmented = React.forwardRef<HTMLDivElement, SegmentedProps>(
  ({ options, value, onChange, size = "default", className, ...props }, ref) => {
    const itemRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

    const enabled = options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => !option.disabled);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (enabled.length === 0) return;
      const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
      const current = enabled.findIndex(({ option }) => option.value === value);
      let next: number;
      switch (event.key) {
        case "ArrowRight":
          next = rtl ? current - 1 : current + 1;
          break;
        case "ArrowLeft":
          next = rtl ? current + 1 : current - 1;
          break;
        case "ArrowDown":
          next = current + 1;
          break;
        case "ArrowUp":
          next = current - 1;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = enabled.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      const wrapped = ((next % enabled.length) + enabled.length) % enabled.length;
      const target = enabled[wrapped];
      onChange?.(target.option.value);
      itemRefs.current[target.index]?.focus();
    };

    const selectedIsEnabled = enabled.some(({ option }) => option.value === value);
    const firstEnabledIndex = enabled.length > 0 ? enabled[0].index : -1;

    return (
      <div
        ref={ref}
        role="radiogroup"
        data-slot="segmented"
        onKeyDown={handleKeyDown}
        className={cn(
          "inline-flex items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground",
          className,
        )}
        {...props}
      >
        {options.map((option, index) => {
          const active = option.value === value;
          const tabIndex = active
            ? 0
            : !selectedIsEnabled && index === firstEnabledIndex
              ? 0
              : -1;
          return (
            <button
              key={option.value}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={option.disabled ? -1 : tabIndex}
              disabled={option.disabled}
              data-slot="segmented-item"
              data-state={active ? "on" : "off"}
              onClick={() => {
                if (!active) onChange?.(option.value);
              }}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                "disabled:pointer-events-none disabled:opacity-50",
                sizeClasses[size],
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  },
);
Segmented.displayName = "Segmented";

export { Segmented };
