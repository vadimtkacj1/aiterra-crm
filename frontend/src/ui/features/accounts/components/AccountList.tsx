import { Card, Flex, Input, Typography } from "antd";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import logoUrl from "../../../../assets/logo-black.svg";
import type { Account } from "../../../../services/interfaces/IAccountService";
import { accountPath, defaultAccountSection } from "../../../navigation/paths";
import { AccountListItem } from "./AccountListItem";

interface Props {
  accounts: Account[];
  loading: boolean;
}

export function AccountList({ accounts, loading }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [hoverAccountId, setHoverAccountId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) => a.name.toLowerCase().includes(q) || String(a.id).includes(q),
    );
  }, [accounts, search]);

  const showSearch = accounts.length > 4;

  return (
    <Card
      loading={loading}
      title={
        <div style={{ display: "flex", justifyContent: "center", padding: "4px 0 8px" }}>
          <img src={logoUrl} alt={t("layout.brand")} width={56} height={56} style={{ display: "block" }} />
        </div>
      }
      style={{
        borderRadius: 12,
        border: "1px solid rgba(15, 23, 42, 0.06)",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
      }}
    >
      {showSearch && !loading && accounts.length > 0 ? (
        <Input.Search
          allowClear
          placeholder={t("accounts.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      <Flex vertical gap={0}>
        {filtered.map((a, index) => (
          <AccountListItem
            key={a.id}
            account={a}
            isFirst={index === 0}
            isHovered={hoverAccountId === a.id}
            onHoverEnter={() => setHoverAccountId(a.id)}
            onHoverLeave={() => setHoverAccountId(null)}
            onOpen={() => navigate(accountPath(String(a.id), defaultAccountSection(a)))}
          />
        ))}
        {!loading && filtered.length === 0 && accounts.length > 0 ? (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0, paddingTop: 8 }}>
            {t("accounts.noSearchResults")}
          </Typography.Paragraph>
        ) : null}
      </Flex>
    </Card>
  );
}
