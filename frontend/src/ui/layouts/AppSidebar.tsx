import { CloseOutlined } from "@ant-design/icons";
import { Button, ConfigProvider, Drawer, Layout, Menu, theme } from "antd";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import logoUrl from "../../assets/logo.svg";
import { LanguageSwitcher } from "../shared/components/LanguageSwitcher";

const { Sider } = Layout;

const SIDEBAR_DARK_BG = "#0f172a";

interface SidebarProps {
  isMobile: boolean;
  drawerOpen: boolean;
  onDrawerClose: () => void;
  menuItems: { key: string; icon: ReactNode; label: string }[];
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
      theme="dark"
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
      src={logoUrl}
      alt={t("layout.brand")}
      style={{ display: "block", width: "100%", maxWidth, height: "auto", objectFit: "contain" }}
    />
  );
}

export function AppSidebar({ isMobile, drawerOpen, onDrawerClose, menuItems, selectedKeys, onMenuClick }: SidebarProps) {
  const { t } = useTranslation();

  if (isMobile) {
    return (
      <Drawer
        title={null}
        placement="right"
        open={drawerOpen}
        onClose={onDrawerClose}
        closable={false}
        styles={{
          wrapper: { width: 288 },
          body: { background: SIDEBAR_DARK_BG, padding: 0, display: "flex", flexDirection: "column" },
          content: { background: SIDEBAR_DARK_BG },
        }}
        aria-label={t("layout.openMenu")}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 12px 0" }}>
          <Button
            type="text"
            shape="circle"
            icon={<CloseOutlined />}
            onClick={onDrawerClose}
            style={{ color: "rgba(255,255,255,0.65)" }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 12px 20px" }}>
          <SidebarLogo maxWidth={136} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <SideMenu menuItems={menuItems} selectedKeys={selectedKeys} onMenuClick={onMenuClick} />
        </div>
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
          <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.12)", background: SIDEBAR_DARK_BG }}>
            <LanguageSwitcher variant="sidebar" />
          </div>
        </ConfigProvider>
      </Drawer>
    );
  }

  return (
    <Sider
      width={248}
      theme="dark"
      style={{
        height: "100vh",
        background: SIDEBAR_DARK_BG,
        position: "fixed",
        insetInlineStart: 0,
        top: 0,
        bottom: 0,
        zIndex: 20,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 12px 16px" }}>
          <SidebarLogo maxWidth={120} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <SideMenu menuItems={menuItems} selectedKeys={selectedKeys} onMenuClick={onMenuClick} />
        </div>
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
          <div style={{ padding: "14px 16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", background: SIDEBAR_DARK_BG }}>
            <LanguageSwitcher variant="sidebar" />
          </div>
        </ConfigProvider>
      </div>
    </Sider>
  );
}
