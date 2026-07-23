import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
    return (
      <Card className="w-full">
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {showSearch && accounts.length > 0 ? (
        <div className="relative">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input
            placeholder={t("accounts.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9 pe-9"
          />
          {search && (
            <button
              type="button"
              aria-label={t("accounts.searchPlaceholder")}
              onClick={() => setSearch("")}
              className="absolute inset-y-0 end-2 my-auto flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      ) : null}

      {filtered.map((a) => (
        <AccountListItem
          key={a.id}
          account={a}
          onOpen={() => navigate(accountPath(String(a.id), defaultAccountSection(a)))}
        />
      ))}

      {filtered.length === 0 && accounts.length > 0 ? (
        <p className="mb-0 pt-2 text-sm text-muted-foreground">
          {t("accounts.noSearchResults")}
        </p>
      ) : null}
    </div>
  );
}
