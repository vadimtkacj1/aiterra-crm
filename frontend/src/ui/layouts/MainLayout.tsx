import {
  AppstoreOutlined,
  BarChartOutlined,
  CreditCardOutlined,
  FacebookOutlined,
  FileTextOutlined,
  GoogleOutlined,
  QuestionCircleOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Grid, Layout } from "antd";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../../app/AppProviders";
import { accountPath, Paths } from "../navigation/paths";
import { OnboardingChecklistCard } from "../shared/onboarding/OnboardingChecklistCard";
import { useOnboardingTracker } from "../shared/onboarding/useOnboardingTracker";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { useLayoutAccount } from "./useLayoutAccount";

const { Content } = Layout;
const DESKTOP_SIDEBAR_WIDTH = 248;

export function MainLayout() {
  const screens = Grid.useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, logout, isAdmin } = useApp();
  const onboarding = useOnboardingTracker(session, isAdmin);
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
      if (accountOutletCtx.currentAccount?.hasMeta) {
        items.push({ key: accountPath(layoutAccountId, "meta"), icon: <FacebookOutlined />, label: t("layout.menuMeta") });
      }
      if (accountOutletCtx.currentAccount?.hasGoogle) {
        items.push({ key: accountPath(layoutAccountId, "google"), icon: <GoogleOutlined />, label: t("layout.menuGoogle") });
      }
      if (!isAdmin) {
        items.push({ key: accountPath(layoutAccountId, "billing"), icon: <WalletOutlined />, label: t("layout.menuBilling") });
      }
    }
    if (isAdmin) {
      items.push(
        { key: Paths.adminStatistics, icon: <BarChartOutlined />, label: t("admin.stats.title") },
        { key: Paths.adminAudit, icon: <SafetyCertificateOutlined />, label: t("admin.audit.menuTitle") },
        { key: Paths.adminUsers, icon: <TeamOutlined />, label: t("admin.userListTitle") },
        { key: Paths.adminPayments, icon: <FileTextOutlined />, label: t("admin.payments.title") },
        { key: Paths.adminMetaBudget, icon: <CreditCardOutlined />, label: t("admin.topup.title") },
      );
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
          {!isAdmin && onboarding.state && location.pathname !== Paths.help ? (
            <OnboardingChecklistCard
              state={onboarding.state}
              dismiss={onboarding.dismiss}
              toggleCollapsed={onboarding.toggleCollapsed}
              hasMeta={Boolean(accountOutletCtx.currentAccount?.hasMeta)}
              accountId={layoutAccountValid ? layoutAccountId : undefined}
            />
          ) : null}
          <Outlet context={accountOutletCtx} />
        </Content>
      </Layout>
    </Layout>
  );
}
