import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Optional text to match against when filtering; falls back to `label`. */
  search?: string;
  disabled?: boolean;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value?: string | null;
  onChange?: (value: string | null) => void;
  /** Trigger text when nothing is selected. */
  placeholder?: string;
  /** Placeholder of the search input. */
  searchPlaceholder?: string;
  /** Rendered when no option matches the query. */
  emptyText?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  /** Show a clear affordance when a value is selected. */
  clearable?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

/**
 * Searchable single-select (replacement for antd `<Select showSearch>`).
 * Filters on `option.search ?? option.label` (case-insensitive substring).
 */
const Combobox = React.forwardRef<HTMLButtonElement, ComboboxProps>(
  (
    {
      options,
      value = null,
      onChange,
      placeholder,
      searchPlaceholder,
      emptyText,
      loading = false,
      disabled = false,
      clearable = false,
      className,
      id,
      "aria-label": ariaLabel,
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");

    const selected = React.useMemo(
      () => options.find((option) => option.value === value) ?? null,
      [options, value],
    );

    const filtered = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return options;
      return options.filter((option) =>
        (option.search ?? option.label).toLowerCase().includes(q),
      );
    }, [options, query]);

    const handleOpenChange = (next: boolean) => {
      setOpen(next);
      if (!next) setQuery("");
    };

    const handleSelect = (optionValue: string) => {
      onChange?.(optionValue);
      handleOpenChange(false);
    };

    const handleClear = (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onChange?.(null);
    };

    return (
      <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <PopoverPrimitive.Trigger asChild disabled={disabled}>
          <button
            ref={ref}
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-label={ariaLabel}
            disabled={disabled}
            data-slot="combobox-trigger"
            className={cn(
              "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground transition-[color,border-color,box-shadow] hover:border-slate-300 focus:outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50",
              className,
            )}
          >
            <span className={cn("line-clamp-1 text-start", !selected && "text-muted-foreground")}>
              {selected ? selected.label : placeholder}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              {clearable && selected && !disabled ? (
                <span
                  role="button"
                  tabIndex={-1}
                  data-slot="combobox-clear"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={handleClear}
                  className="rounded-sm opacity-50 transition-opacity hover:opacity-100"
                >
                  <X className="size-3.5" />
                </span>
              ) : null}
              <ChevronsUpDown className="size-4 opacity-50" />
            </span>
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            data-slot="combobox-content"
            className="z-50 w-[var(--radix-popover-trigger-width)] min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none"
          >
            <Command shouldFilter={false} className="flex w-full flex-col">
              <div className="flex items-center gap-2 border-b border-border px-3">
                <Search className="size-4 shrink-0 opacity-50" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder={searchPlaceholder}
                  className="h-9 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <Command.List className="max-h-64 overflow-y-auto overflow-x-hidden p-1">
                {loading ? (
                  <div className="flex items-center justify-center py-6" data-slot="combobox-loading">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                      {emptyText}
                    </Command.Empty>
                    {filtered.map((option) => (
                      <Command.Item
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                        onSelect={() => handleSelect(option.value)}
                        className="relative flex cursor-default select-none items-center rounded-sm py-1.5 ps-2 pe-8 text-sm outline-none transition-colors data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50"
                      >
                        <span className="line-clamp-1 text-start">{option.label}</span>
                        {value === option.value ? (
                          <Check className="absolute end-2 size-4" />
                        ) : null}
                      </Command.Item>
                    ))}
                  </>
                )}
              </Command.List>
            </Command>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  },
);
Combobox.displayName = "Combobox";

export { Combobox };
