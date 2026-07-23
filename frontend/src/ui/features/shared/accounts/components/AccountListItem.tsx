import { Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FacebookIcon } from "@/components/icons/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Account } from "@/services/accounts/IAccountService";

function accountInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "•";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

interface Props {
  account: Account;
  onOpen: () => void;
}

export function AccountListItem({ account, onOpen }: Props) {
  const { t } = useTranslation();

  return (
    <Card className="ds-card-interactive w-full cursor-pointer" onClick={onOpen}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-[10px] text-[15px] font-semibold"
            style={{ background: "var(--ds-surface-2)", color: "var(--ds-text-secondary)" }}
            aria-hidden="true"
          >
            {accountInitials(account.name)}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[15px] font-semibold">{account.name}</span>
            <div>
              {account.hasMeta ? (
                <Badge variant="primary">
                  <FacebookIcon />
                  {t("accounts.badgeMeta")}
                </Badge>
              ) : (
                <Badge>
                  <Wallet />
                  {t("accounts.badgeNoMeta")}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          {t("accounts.open")}
        </Button>
      </div>
    </Card>
  );
}
