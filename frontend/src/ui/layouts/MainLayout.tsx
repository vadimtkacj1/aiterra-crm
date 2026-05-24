import {
  AppstoreOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Grid, Layout } from "antd";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "@/app/AppProviders";
import { accountPath, Paths } from "@/ui/navigation/paths";
import { GuidedTourProvider } from "@/ui/shared/onboarding/guidedTourContext";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { useLayoutAccount } from "./useLayoutAccount";
import { accountModules, adminModules, type AccountModuleCtx } from "@/ui/modules";

const { Content } = Layout;
const DESKTOP_SIDEBAR_WIDTH = 248;

export function MainLayout() {
  const screens = Grid.useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, logout, isAdmin } = useApp();
  const { t } = useTranslation();

  const { layoutAccountId, layoutAccountValid, accountOutletCtx } = useLayoutAccount();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const contentRef = useRef<HTMLElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  const isMobile = !screens.md;
  const showAccountContext = Boolean(layoutAccountValid && layoutAccountId);

  const menuItems = useMemo(() => {
    const items: { key: string; icon: ReactNode; label: string }[] = [];

    if (layoutAccountValid && layoutAccountId) {
      if (accountOutletCtx.totalAccountCount > 1) {
        items.push({ key: Paths.accounts, icon: <AppstoreOutlined />, label: t("layout.menuBusinesses") });
      }

      const ctx: AccountModuleCtx = {
        accountId: layoutAccountId,
        isAdmin,
        hasMeta: accountOutletCtx.currentAccount?.hasMeta ?? false,
        hasGoogle: accountOutletCtx.currentAccount?.hasGoogle ?? false,
        hasSite: accountOutletCtx.currentAccount?.hasSite ?? false,
        totalAccounts: accountOutletCtx.totalAccountCount,
      };

      items.push(...accountModules.flatMap((m) => m.navItems?.(ctx, t) ?? []));
    }

    if (isAdmin) {
      items.push(...adminModules.map((m) => m.navItem(t)));
    }

    items.push({ key: Paths.help, icon: <QuestionCircleOutlined />, label: t("help.menuTitle") });
    items.push({
      key: layoutAccountValid && layoutAccountId ? accountPath(layoutAccountId, "settings") : Paths.accounts,
      icon: <SettingOutlined />,
      label: t("layout.menuSettings"),
    });

    return items;
  }, [
    t,
    isAdmin,
    layoutAccountValid,
    layoutAccountId,
    accountOutletCtx.currentAccount?.hasMeta,
    accountOutletCtx.currentAccount?.hasGoogle,
    accountOutletCtx.currentAccount?.hasSite,
    accountOutletCtx.totalAccountCount,
  ]);

  const selectedKeys = useMemo(() => {
    const p = location.pathname;
    return p === Paths.admin ? [Paths.adminStatistics] : [p];
  }, [location.pathname]);

  const handleMenuClick = (key: string) => {
    navigate(key);
    setDrawerOpen(false);
  };

  const displayName = session?.user.displayName || session?.user.email || "";
  const userEmail = session?.user.email ?? "";

  return (
    <GuidedTourProvider isAdmin={isAdmin} showAccountContext={showAccountContext}>
      <Layout style={{ minHeight: "100vh", alignItems: "stretch" }}>
      <AppSidebar
        isMobile={isMobile}
        drawerOpen={drawerOpen}
        onDrawerClose={() => setDrawerOpen(false)}
        menuItems={menuItems}
        selectedKeys={selectedKeys}
        onMenuClick={handleMenuClick}
      />

      <Layout
        style={{
          minWidth: 0,
          marginInlineStart: isMobile ? 0 : DESKTOP_SIDEBAR_WIDTH,
        }}
      >
        <AppHeader
          isMobile={isMobile}
          onMenuOpen={() => setDrawerOpen(true)}
          layoutAccountId={layoutAccountId}
          layoutAccountValid={layoutAccountValid}
          showAccountContext={showAccountContext}
          accountOutletCtx={accountOutletCtx}
          displayName={displayName}
          userEmail={userEmail}
          isAdmin={isAdmin}
          onLogout={logout}
        />

        <Content
          ref={contentRef}
          style={{
            padding: isMobile ? 16 : 28,
            overflow: "visible",
            minHeight: "calc(100vh - 56px)",
          }}
        >
          <Outlet context={accountOutletCtx} />
        </Content>
      </Layout>
    </Layout>
    </GuidedTourProvider>
  );
}
