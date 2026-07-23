import { Check, ChevronDown, Globe, LogOut, Menu, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MenuDropdown } from "@/components/ui/menu-compat";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { accountPath, Paths } from "@/ui/navigation/paths";
import { UserNotificationCenter } from "@/ui/shared/components/UserNotificationCenter";
import type { AccountLayoutOutletContext } from "./accountLayoutContext";

interface AppHeaderProps {
  isMobile: boolean;
  onMenuOpen: () => void;
  layoutAccountId: string | undefined;
  layoutAccountValid: boolean;
  showAccountContext: boolean;
  accountOutletCtx: AccountLayoutOutletContext;
  displayName: string;
  /** Used to avoid showing the same label twice when display name equals the current business name. */
  userEmail: string;
  isAdmin: boolean;
  onLogout: () => void;
}

function AccountInfo({
  accountOutletCtx,
  isMobile,
}: {
  accountOutletCtx: AccountLayoutOutletContext;
  isMobile: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (accountOutletCtx.accountLoading) {
    return (
      <span className="flex items-center gap-2">
        <Spinner size="sm" label={t("layout.loadingBusiness")} />
        <span className="truncate text-sm text-muted-foreground">
          {t("layout.loadingBusiness")}
        </span>
      </span>
    );
  }

  return (
    <>
      <span className={cn("truncate font-semibold text-foreground", isMobile ? "text-[13px]" : "text-sm")}>
        {accountOutletCtx.currentAccount?.name ?? t("layout.accountLabel")}
      </span>
      {accountOutletCtx.totalAccountCount > 1 ? (
        <button
          type="button"
          className="self-start text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => navigate(Paths.accounts)}
        >
          {t("layout.switchBusiness")}
        </button>
      ) : null}
    </>
  );
}

export function AppHeader({
  isMobile,
  onMenuOpen,
  layoutAccountId,
  layoutAccountValid,
  showAccountContext,
  accountOutletCtx,
  displayName,
  userEmail,
  isAdmin,
  onLogout,
}: AppHeaderProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAdminRoute = pathname === Paths.admin || pathname.startsWith(`${Paths.admin}/`);
  const businessName = accountOutletCtx.currentAccount?.name?.trim();
  const headerNameDuplicate = Boolean(
    showAccountContext && layoutAccountId && businessName && displayName && displayName.trim() === businessName,
  );
  const hideHeaderRightName = headerNameDuplicate && !userEmail;
  const headerRightLabel = headerNameDuplicate && userEmail ? userEmail : displayName;

  const settingsPath =
    layoutAccountValid && layoutAccountId
      ? accountPath(layoutAccountId, "settings")
      : Paths.accounts;
  const currentLang = i18n.language.startsWith("he") ? "he" : "en";

  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-14 items-center justify-between gap-2",
        "border-b border-border bg-card shadow-[0_1px_0_rgba(0,0,0,0.03)]",
        isMobile ? "px-3" : "px-5",
      )}
    >
      {/* First group: burger + current account */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuOpen}
            aria-label={t("layout.openMenu")}
          >
            <Menu aria-hidden="true" />
          </Button>
        )}
        {showAccountContext && layoutAccountId ? (
          <div
            data-tour-target="header-account"
            className="flex min-w-0 flex-1 flex-col justify-center leading-[1.35]"
          >
            {isAdmin && isAdminRoute ? (
              <span className={cn("truncate text-muted-foreground", isMobile ? "text-[13px]" : "text-sm")}>
                {t("layout.adminContext")}
              </span>
            ) : (
              <AccountInfo accountOutletCtx={accountOutletCtx} isMobile={isMobile} />
            )}
          </div>
        ) : null}
      </div>

      {/* Right: notifications + user menu (avatar dropdown: settings / sign out) */}
      <div className={cn("flex items-center", isMobile ? "gap-1" : "gap-2")}>
        {showAccountContext && layoutAccountId && !isAdmin ? (
          <UserNotificationCenter accountId={layoutAccountId} />
        ) : null}
        <MenuDropdown
          align="end"
          items={[
            {
              key: "settings",
              icon: <Settings aria-hidden="true" />,
              label: t("layout.menuSettings"),
              onClick: () => navigate(settingsPath),
            },
            {
              key: "language",
              icon: <Globe aria-hidden="true" />,
              label: t("common.language"),
              children: [
                {
                  key: "lang-he",
                  icon: currentLang === "he" ? <Check aria-hidden="true" /> : null,
                  label: t("common.hebrew"),
                  onClick: () => void i18n.changeLanguage("he"),
                },
                {
                  key: "lang-en",
                  icon: currentLang === "en" ? <Check aria-hidden="true" /> : null,
                  label: t("common.english"),
                  onClick: () => void i18n.changeLanguage("en"),
                },
              ],
            },
            { type: "divider" },
            {
              key: "logout",
              icon: <LogOut aria-hidden="true" />,
              label: t("layout.signOut"),
              danger: true,
              onClick: onLogout,
            },
          ]}
        >
          <Button
            variant="ghost"
            aria-label={headerRightLabel || t("layout.menuSettings")}
            className={cn("flex h-10 items-center gap-2 rounded-[10px]", isMobile ? "px-1" : "px-2")}
          >
            <Avatar className="size-7.5 shrink-0">
              <AvatarFallback className="bg-accent text-[13px] font-semibold text-primary">
                {(headerRightLabel || userEmail || "?").trim().charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!isMobile && !hideHeaderRightName && headerRightLabel ? (
              <span
                className="max-w-40 truncate text-[13px] font-medium text-foreground"
                title={headerRightLabel}
              >
                {headerRightLabel}
              </span>
            ) : null}
            <ChevronDown aria-hidden="true" className="size-2.5! text-(--ds-text-tertiary)" />
          </Button>
        </MenuDropdown>
      </div>
    </header>
  );
}
