import { FolderOpen } from "lucide-react";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/ui/shared/components/PageHeader";

type Props = {
  t: TFunction;
  loadingUsers: boolean;
  onOpenLibrary: () => void;
};

export function AdminPaymentsPageHeader({ t, loadingUsers, onOpenLibrary }: Props) {
  return (
    <PageHeader
      title={t("admin.payments.title")}
      subtitle={t("admin.payments.introShort")}
      actions={
        <Button variant="outline" onClick={onOpenLibrary} disabled={loadingUsers}>
          {loadingUsers ? (
            <Spinner size="sm" className="text-current" aria-hidden="true" />
          ) : (
            <FolderOpen aria-hidden="true" />
          )}
          {t("admin.payments.libraryDrawerTrigger")}
        </Button>
      }
    />
  );
}
