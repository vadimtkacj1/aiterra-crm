import * as React from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Calendar built on react-day-picker, styled with the app design tokens.
 * Direction-aware: nav chevrons flip automatically under `dir="rtl"`.
 */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "flex w-full flex-col gap-4",
        month_caption: "flex h-7 items-center justify-center",
        caption_label: "text-sm font-medium text-foreground",
        nav: "absolute inset-x-0 top-0 z-10 flex items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 p-0 text-muted-foreground opacity-70 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 p-0 text-muted-foreground opacity-70 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-[0.8rem] font-normal text-muted-foreground",
        week: "mt-2 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm text-foreground",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        ),
        selected: cn(
          "rounded-md",
          "[&>button]:bg-primary [&>button]:text-primary-foreground",
          "[&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
          "[&>button]:focus-visible:bg-primary [&>button]:focus-visible:text-primary-foreground",
        ),
        today: "[&>button]:font-semibold [&>button]:text-primary",
        outside: "text-muted-foreground opacity-50 [&>button]:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        range_start: "rounded-e-none",
        range_end: "rounded-s-none",
        range_middle: cn(
          "rounded-none",
          "[&>button]:bg-accent [&>button]:text-accent-foreground",
          "[&>button]:hover:bg-accent [&>button]:hover:text-accent-foreground",
        ),
        hidden: "invisible",
        footer: "pt-3 text-sm text-muted-foreground",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, disabled, ...chevronProps }) => {
          const Icon =
            orientation === "up"
              ? ChevronUp
              : orientation === "down"
                ? ChevronDown
                : orientation === "right"
                  ? ChevronRight
                  : ChevronLeft;
          return (
            <Icon
              className={cn(
                "size-4",
                disabled && "opacity-50",
                // Prev/next arrows must point the other way in RTL.
                (orientation === "left" || orientation === "right") && "rtl:rotate-180",
                chevronClassName,
              )}
              aria-hidden="true"
              {...chevronProps}
            />
          );
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
