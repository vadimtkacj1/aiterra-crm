import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* antd-compatible menu item types (subset of antd MenuProps["items"]) */
/* ------------------------------------------------------------------ */

export interface MenuCompatClickInfo {
  key: string;
}

export interface MenuCompatEntry {
  key: React.Key;
  label: React.ReactNode;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: (info: MenuCompatClickInfo) => void;
  /** Presence of children (without type:"group") renders a submenu. */
  children?: MenuCompatItemType[];
}

export interface MenuCompatDivider {
  type: "divider";
  key?: React.Key;
}

export interface MenuCompatGroup {
  type: "group";
  key?: React.Key;
  label?: React.ReactNode;
  children?: MenuCompatItemType[];
}

export type MenuCompatItemType =
  | MenuCompatEntry
  | MenuCompatDivider
  | MenuCompatGroup
  | null
  | undefined;

export interface MenuDropdownProps {
  /** antd-style `menu.items` array. */
  items?: MenuCompatItemType[];
  /** antd-style menu-level `menu.onClick` — fires for leaf items after the item's own onClick. */
  onClick?: (info: MenuCompatClickInfo) => void;
  /** Trigger element (rendered via Radix `asChild`). Must accept a ref, e.g. a Button. */
  children: React.ReactElement;
  /** Disable opening the dropdown. */
  disabled?: boolean;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  /** className applied to the dropdown content surface. */
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function isDivider(item: MenuCompatItemType): item is MenuCompatDivider {
  return !!item && "type" in item && item.type === "divider";
}

function isGroup(item: MenuCompatItemType): item is MenuCompatGroup {
  return !!item && "type" in item && item.type === "group";
}

function renderItems(
  items: MenuCompatItemType[],
  menuOnClick?: (info: MenuCompatClickInfo) => void,
): React.ReactNode {
  return items.map((item, index) => {
    if (!item) return null;

    if (isDivider(item)) {
      return <DropdownMenuSeparator key={item.key ?? `divider-${index}`} />;
    }

    if (isGroup(item)) {
      return (
        <DropdownMenuGroup key={item.key ?? `group-${index}`}>
          {item.label != null && (
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              {item.label}
            </DropdownMenuLabel>
          )}
          {item.children ? renderItems(item.children, menuOnClick) : null}
        </DropdownMenuGroup>
      );
    }

    const entry = item as MenuCompatEntry;

    if (entry.children && entry.children.length > 0) {
      return (
        <DropdownMenuSub key={entry.key}>
          <DropdownMenuSubTrigger disabled={entry.disabled}>
            {entry.icon}
            <span className="flex-1 text-start">{entry.label}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {renderItems(entry.children, menuOnClick)}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }

    return (
      <DropdownMenuItem
        key={entry.key}
        disabled={entry.disabled}
        variant={entry.danger ? "destructive" : "default"}
        onSelect={() => {
          const info: MenuCompatClickInfo = { key: String(entry.key) };
          entry.onClick?.(info);
          menuOnClick?.(info);
        }}
      >
        {entry.icon}
        <span className="flex-1 text-start">{entry.label}</span>
      </DropdownMenuItem>
    );
  });
}

/**
 * Compat wrapper for migrated antd code:
 *
 *   <Dropdown menu={{ items }}><Button /></Dropdown>
 *     →
 *   <MenuDropdown items={items}><Button /></MenuDropdown>
 */
const MenuDropdown = ({
  items,
  onClick,
  children,
  disabled,
  align = "start",
  side,
  className,
  open,
  onOpenChange,
  modal,
}: MenuDropdownProps) => (
  <DropdownMenu open={open} onOpenChange={onOpenChange} modal={modal}>
    <DropdownMenuTrigger asChild disabled={disabled}>
      {children}
    </DropdownMenuTrigger>
    <DropdownMenuContent align={align} side={side} className={cn(className)}>
      {items ? renderItems(items, onClick) : null}
    </DropdownMenuContent>
  </DropdownMenu>
);
MenuDropdown.displayName = "MenuDropdown";

export { MenuDropdown };
