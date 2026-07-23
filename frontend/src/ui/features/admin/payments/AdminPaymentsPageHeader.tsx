import { FolderOpen, ShoppingBag } from "lucide-react";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { AdminPaymentsTokenLike } from "./adminPaymentsPageUi";

type Props = {
  t: TFunction;
  token: AdminPaymentsTokenLike;
  shellRadius: number;
  shellShadow: string;
  loadingUsers: boolean;
  onOpenLibrary: () => void;
};

export function AdminPaymentsPageHeader({
  t,
  token,
  shellRadius,
  shellShadow,
  loadingUsers,
  onOpenLibrary,
}: Props) {
  return (
    <div
      className="bg-card"
      style={{
        borderRadius: shellRadius,
        padding: "18px 20px",
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: shellShadow,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4.5">
        <div className="flex min-w-0 flex-[1_1_280px] flex-wrap items-start gap-4.5">
          <div
            className="flex size-11.5 shrink-0 items-center justify-center rounded-xl bg-card"
            style={{
              border: `1px solid ${token.colorPrimaryBorder}`,
              color: token.colorPrimary,
            }}
          >
            <ShoppingBag aria-hidden="true" className="size-5.5" />
          </div>
          <div className="min-w-0 flex-[1_1_240px]">
            <h3 className="mb-1.5 mt-0 text-xl font-bold tracking-[-0.01em] text-foreground">
              {t("admin.payments.title")}
            </h3>
            <p className="mb-0 max-w-180 text-[13px] leading-normal text-muted-foreground">
              {t("admin.payments.introShort")}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={onOpenLibrary}
          disabled={loadingUsers}
          className="mt-0.5 shrink-0 self-start"
        >
          {loadingUsers ? (
            <Spinner size="sm" className="text-current" aria-hidden="true" />
          ) : (
            <FolderOpen aria-hidden="true" />
          )}
          {t("admin.payments.libraryDrawerTrigger")}
        </Button>
      </div>
    </div>
  );
}
