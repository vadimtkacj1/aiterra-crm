import { DownOutlined, LogoutOutlined, MenuOutlined, SettingOutlined } from "@ant-design/icons";
import { Avatar, Button, Dropdown, Layout, Space, Spin, theme, Typography } from "antd";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { accountPath, Paths } from "@/ui/navigation/paths";
import { UserNotificationCenter } from "@/ui/shared/components/UserNotificationCenter";
import type { AccountLayoutOutletContext } from "./accountLayoutContext";

const { Header } = Layout;

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
      <Space size="small" align="center">
        <Spin size="small" />
        <Typography.Text type="secondary" ellipsis>
          {t("layout.loadingBusiness")}
        </Typography.Text>
      </Space>
    );
  }

  return (
    <>
      <Typography.Text strong ellipsis style={{ fontSize: isMobile ? 13 : 14 }}>
        {accountOutletCtx.currentAccount?.name ?? t("layout.accountLabel")}
      </Typography.Text>
      {accountOutletCtx.totalAccountCount > 1 ? (
        <Typography.Link style={{ fontSize: 12 }} onClick={() => navigate(Paths.accounts)}>
          {t("layout.switchBusiness")}
        </Typography.Link>
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { token } = theme.useToken();
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

  return (
    <Header
      style={{
        padding: isMobile ? "0 12px" : "0 20px",
        height: 56,
        lineHeight: "56px",
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: "0 1px 0 rgba(0, 0, 0, 0.03)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* First group: burger + current account */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
        {isMobile && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onMenuOpen}
            size="middle"
            aria-label={t("layout.openMenu")}
          />
        )}
        {showAccountContext && layoutAccountId ? (
          <div
            data-tour-target="header-account"
            style={{
              minWidth: 0,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              lineHeight: 1.35,
            }}
          >
            {isAdmin && isAdminRoute ? (
              <Typography.Text type="secondary" ellipsis style={{ fontSize: isMobile ? 13 : 14 }}>
                {t("layout.adminContext")}
              </Typography.Text>
            ) : (
              <AccountInfo accountOutletCtx={accountOutletCtx} isMobile={isMobile} />
            )}
          </div>
        ) : null}
      </div>

      {/* Right: notifications + user menu (avatar dropdown: settings / sign out) */}
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 8 }}>
        {showAccountContext && layoutAccountId && !isAdmin ? (
          <UserNotificationCenter accountId={layoutAccountId} />
        ) : null}
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              {
                key: "settings",
                icon: <SettingOutlined />,
                label: t("layout.menuSettings"),
                onClick: () => navigate(settingsPath),
              },
              { type: "divider" },
              {
                key: "logout",
                icon: <LogoutOutlined />,
                label: t("layout.signOut"),
                danger: true,
                onClick: onLogout,
              },
            ],
          }}
        >
          <Button
            type="text"
            aria-label={headerRightLabel || t("layout.menuSettings")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 40,
              paddingInline: isMobile ? 4 : 8,
              borderRadius: 10,
            }}
          >
            <Avatar
              size={30}
              style={{
                background: "var(--ds-color-primary-surface-deep)",
                color: "var(--ds-color-primary)",
                fontWeight: 600,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {(headerRightLabel || userEmail || "?").trim().charAt(0).toUpperCase()}
            </Avatar>
            {!isMobile && !hideHeaderRightName && headerRightLabel ? (
              <Typography.Text
                ellipsis
                style={{ maxWidth: 160, fontSize: 13, fontWeight: 500 }}
                title={headerRightLabel}
              >
                {headerRightLabel}
              </Typography.Text>
            ) : null}
            <DownOutlined style={{ fontSize: 10, color: "var(--ds-text-tertiary)" }} />
          </Button>
        </Dropdown>
      </div>
    </Header>
  );
}
