import { CloseOutlined } from "@ant-design/icons";
import { Button, Drawer, Layout, Menu } from "antd";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import logoDarkUrl from "@/assets/logo-black.svg";
import { LanguageSwitcher } from "@/ui/shared/components/LanguageSwitcher";

const { Sider } = Layout;

/* Light shell (Stripe/Attio/Linear signature): white sidebar separated from
   the canvas by a hairline; violet reserved for the active item only. */
const SIDEBAR_BG = "var(--ds-surface-0)";
const SIDEBAR_BORDER = "1px solid var(--ds-border-subtle)";

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

function SideMenu({
  menuItems,
  selectedKeys,
  onMenuClick,
}: Pick<SidebarProps, "menuItems" | "selectedKeys" | "onMenuClick">) {
  return (
    <Menu
      className="app-sider-nav"
      theme="light"
      mode="inline"
      selectedKeys={selectedKeys}
      items={menuItems}
      onClick={({ key }) => onMenuClick(key)}
      style={{ borderInlineEnd: "none", background: "transparent" }}
    />
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
      style={{ display: "block", width: "100%", maxWidth, height: "auto", objectFit: "contain", aspectRatio: "1/1" }}
    />
  );
}

export function AppSidebar({ isMobile, drawerOpen, onDrawerClose, menuItems, selectedKeys, onMenuClick }: SidebarProps) {
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <Drawer
        title={null}
        placement="left"
        open={drawerOpen}
        onClose={onDrawerClose}
        closable={false}
        styles={{
          wrapper: { width: 288 },
          body: { background: SIDEBAR_BG, padding: 0, display: "flex", flexDirection: "column" },
          content: { background: SIDEBAR_BG },
        }}
        aria-label={t("layout.openMenu")}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 12px 0" }}>
          <Button
            type="text"
            shape="circle"
            icon={<CloseOutlined />}
            onClick={onDrawerClose}
            aria-label={t("layout.closeMenu")}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 12px 16px" }}>
          <SidebarLogo maxWidth={112} />
        </div>
        <div data-tour-target="sidebar-nav" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <SideMenu menuItems={menuItems} selectedKeys={selectedKeys} onMenuClick={onMenuClick} />
        </div>
        <div style={{ padding: "14px 16px 18px", borderTop: SIDEBAR_BORDER, background: SIDEBAR_BG }}>
          <LanguageSwitcher variant="sidebar" />
        </div>
      </Drawer>
    );
  }

  return (
    <Sider
      width={248}
      theme="light"
      style={{
        height: "100vh",
        background: SIDEBAR_BG,
        borderInlineEnd: SIDEBAR_BORDER,
        position: "fixed",
        insetInlineStart: 0,
        top: 0,
        bottom: 0,
        zIndex: 20,
      }}
    >
      {/* height (not minHeight): the container must stay within the viewport so
          the middle nav area scrolls instead of pushing the footer off-screen */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 12px 10px" }}>
          <SidebarLogo maxWidth={96} />
        </div>
        <div data-tour-target="sidebar-nav" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <SideMenu menuItems={menuItems} selectedKeys={selectedKeys} onMenuClick={onMenuClick} />
        </div>
        <div style={{ padding: "12px 16px 16px", borderTop: SIDEBAR_BORDER, background: SIDEBAR_BG }}>
          <LanguageSwitcher variant="sidebar" />
        </div>
      </div>
    </Sider>
  );
}
