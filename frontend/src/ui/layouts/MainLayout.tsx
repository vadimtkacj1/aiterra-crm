import { CircleHelp } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "@/app/AppProviders";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/use-media-query";
import { Paths } from "@/ui/navigation/paths";
import { GuidedTourProvider } from "@/ui/shared/onboarding/guidedTourContext";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { useLayoutAccount } from "./useLayoutAccount";
import { accountModules, adminModules, type AccountModuleCtx } from "@/ui/modules";

export function MainLayout() {
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

  const isMobile = useIsMobile();
  const showAccountContext = Boolean(layoutAccountValid && layoutAccountId);

  const menuItems = useMemo(() => {
    type MenuEntry =
      | { key: string; icon: ReactNode; label: string }
      | { type: "group"; label: string; children: { key: string; icon: ReactNode; label: string }[] };
    const items: MenuEntry[] = [];

    if (layoutAccountValid && layoutAccountId) {
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
      // Group consecutive admin sections under their navGroupKey labels
      // (Refero-canonical grouped sidebar: Fernand / Navan / Shopify pattern).
      let currentGroup: Extract<MenuEntry, { type: "group" }> | null = null;
      for (const m of adminModules) {
        const item = m.navItem(t);
        if (!m.navGroupKey) {
          currentGroup = null;
          items.push(item);
          continue;
        }
        const label = t(m.navGroupKey);
        if (!currentGroup || currentGroup.label !== label) {
          currentGroup = { type: "group", label, children: [] };
          items.push(currentGroup);
        }
        currentGroup.children.push(item);
      }
    }

    items.push({ key: Paths.help, icon: <CircleHelp />, label: t("help.menuTitle") });

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
      <div className="flex min-h-dvh items-stretch bg-muted">
        <a href="#main-content" className="skip-link">
          {t("accessibility.skipToContent")}
        </a>
        <AppSidebar
          isMobile={isMobile}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
          menuItems={menuItems}
          selectedKeys={selectedKeys}
          onMenuClick={handleMenuClick}
        />

        <div className={cn("flex min-w-0 flex-1 flex-col", !isMobile && "ms-62")}>
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

          <main
            id="main-content"
            ref={contentRef}
            className={cn(
              "min-h-[calc(100dvh-56px)] flex-1 overflow-auto",
              isMobile ? "p-4" : "p-7",
            )}
          >
            <Outlet context={accountOutletCtx} />
          </main>
        </div>
      </div>
    </GuidedTourProvider>
  );
}
