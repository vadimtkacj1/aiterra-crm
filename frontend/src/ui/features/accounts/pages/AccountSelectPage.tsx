import { App, Alert, Flex, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../../../../app/AppProviders";
import type { Account } from "../../../../services/interfaces/IAccountService";
import { accountPath, defaultAccountSection, Paths } from "../../../navigation/paths";
import { UserContentLayout } from "../../../shared/components/UserContentLayout";
import { AccountList } from "../components/AccountList";

export function AccountSelectPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { services } = useApp();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const messageRef = useRef(message);
  const tRef = useRef(t);
  messageRef.current = message;
  tRef.current = t;

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await services.accounts.listMyAccounts();
        if (!mounted) return;
        setAccounts(rows);
        if (rows.length === 1) {
          const section = defaultAccountSection(rows[0]);
          navigate(accountPath(String(rows[0].id), section), { replace: true });
          return;
        }
      } catch (e) {
        if (mounted) {
          messageRef.current.error(e instanceof Error ? e.message : tRef.current("accounts.loadError"));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate, services.accounts]);

  return (
    <UserContentLayout maxWidth={560}>
      <Flex vertical gap="large" style={{ width: "100%" }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t("accounts.title")}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {t("accounts.subtitle")}
          </Typography.Paragraph>
        </div>

        <Alert
          type="info"
          showIcon
          message={
            <span>
              {t("onboarding.accountsAlert")}{" "}
              <Link to={Paths.help}>{t("help.menuTitle")}</Link>
            </span>
          }
        />

        <AccountList accounts={accounts} loading={loading} />
      </Flex>
    </UserContentLayout>
  );
}
