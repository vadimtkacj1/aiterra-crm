import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import logoDarkUrl from "@/assets/logo-black.svg";

type SidebarMenuItem =
  | { key: string; icon: ReactNode; label: string }
  | { type: "group"; label: string; children: { key: string; icon: ReactNode; label: string }[] };

interface SidebarProps {
  isMobile: boolean;
  drawerOpen: boolean;
  onDrawerClose: () => void;
  menuItems: SidebarMenuItem[];
  selectedKeys: string[];
  onMenuClick: (key: string) => void;
}

function isGroup(
  item: SidebarMenuItem,
): item is Extract<SidebarMenuItem, { type: "group" }> {
  return "type" in item && item.type === "group";
}

/* Light shell (Stripe/Attio/Linear signature): white sidebar separated from
   the canvas by a hairline; violet reserved for the active item only. */
function NavItem({
  item,
  selected,
  onClick,
}: {
  item: Extract<SidebarMenuItem, { key: string }>;
  selected: boolean;
  onClick: (key: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onClick(item.key)}
        aria-current={selected ? "page" : undefined}
        className={cn(
          "relative mx-3 flex h-10 w-[calc(100%-1.5rem)] items-center gap-2 rounded-md px-4 text-start text-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected
            ? "bg-accent font-medium text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {selected && (
          <span
            aria-hidden="true"
            className="absolute inset-s-0 top-1.75 bottom-1.75 w-0.75 rounded-e-full bg-primary [background-image:var(--ds-gradient-brand)]"
          />
        )}
        <span
          aria-hidden="true"
          className={cn(
            "flex shrink-0 items-center justify-center text-sm [&_svg]:size-4",
            selected ? "text-primary" : "text-(--ds-text-tertiary)",
          )}
        >
          {item.icon}
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </button>
    </li>
  );
}

function SideMenu({
  menuItems,
  selectedKeys,
  onMenuClick,
}: Pick<SidebarProps, "menuItems" | "selectedKeys" | "onMenuClick">) {
  return (
    <nav className="py-1">
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {menuItems.map((item, index) =>
          isGroup(item) ? (
            <li key={`group-${item.label}-${index}`}>
              <div
                className={cn(
                  "pb-0.5 pe-4 ps-7 text-[11px] font-semibold uppercase tracking-[0.07em] text-(--ds-text-tertiary)",
                  index === 0 ? "pt-1" : "pt-2.5",
                )}
              >
                {item.label}
              </div>
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {item.children.map((child) => (
                  <NavItem
                    key={child.key}
                    item={child}
                    selected={selectedKeys.includes(child.key)}
                    onClick={onMenuClick}
                  />
                ))}
              </ul>
            </li>
          ) : (
            <NavItem
              key={item.key}
              item={item}
              selected={selectedKeys.includes(item.key)}
              onClick={onMenuClick}
            />
          ),
        )}
      </ul>
    </nav>
  );
}

function SidebarLogo({ maxWidth }: { maxWidth: number }) {
  const { t } = useTranslation();
  return (
    <img
      src={logoDarkUrl}
      alt={t("layout.brand")}
      width={maxWidth}
      height={maxWidth}
      className="block h-auto w-full object-contain"
      style={{ maxWidth, aspectRatio: "1/1" }}
    />
  );
}

export function AppSidebar({ isMobile, drawerOpen, onDrawerClose, menuItems, selectedKeys, onMenuClick }: SidebarProps) {
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <Sheet open={drawerOpen} onOpenChange={(open) => { if (!open) onDrawerClose(); }}>
        <SheetContent
          side="start"
          hideClose
          aria-label={t("layout.openMenu")}
          aria-describedby={undefined}
          className="w-72 gap-0 bg-background p-0"
        >
          <SheetTitle className="sr-only">{t("layout.brand")}</SheetTitle>
          <div className="flex justify-end pe-3 ps-3 pt-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={onDrawerClose}
              aria-label={t("layout.closeMenu")}
            >
              <X aria-hidden="true" />
            </Button>
          </div>
          <div className="flex justify-center px-3 pb-4 pt-1">
            <SidebarLogo maxWidth={112} />
          </div>
          <div data-tour-target="sidebar-nav" className="min-h-0 flex-1 overflow-auto">
            <SideMenu menuItems={menuItems} selectedKeys={selectedKeys} onMenuClick={onMenuClick} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="fixed inset-s-0 top-0 z-20 h-dvh w-62 border-e border-border bg-background">
      {/* height (not minHeight): the container must stay within the viewport so
          the middle nav area scrolls instead of pushing the footer off-screen */}
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-center pb-2.5 pe-3 ps-3 pt-4">
          <SidebarLogo maxWidth={96} />
        </div>
        <div data-tour-target="sidebar-nav" className="min-h-0 flex-1 overflow-auto">
          <SideMenu menuItems={menuItems} selectedKeys={selectedKeys} onMenuClick={onMenuClick} />
        </div>
      </div>
    </aside>
  );
}
