import { Card, Flex, Input, Typography } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { Account } from "@/services/accounts/IAccountService";
import { accountPath, defaultAccountSection } from "@/ui/navigation/paths";
import { AccountListItem } from "./AccountListItem";

interface Props {
  accounts: Account[];
  loading: boolean;
}

export function AccountList({ accounts, loading }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) => a.name.toLowerCase().includes(q) || String(a.id).includes(q),
    );
  }, [accounts, search]);

  const showSearch = accounts.length > 4;

  if (loading) {
    return <Card loading style={{ width: "100%" }} />;
  }

  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
      {showSearch && accounts.length > 0 ? (
        <Input.Search
          allowClear
          placeholder={t("accounts.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      ) : null}

      {filtered.map((a) => (
        <AccountListItem
          key={a.id}
          account={a}
          onOpen={() => navigate(accountPath(String(a.id), defaultAccountSection(a)))}
        />
      ))}

      {filtered.length === 0 && accounts.length > 0 ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, paddingTop: 8 }}>
          {t("accounts.noSearchResults")}
        </Typography.Paragraph>
      ) : null}
    </Flex>
  );
}
