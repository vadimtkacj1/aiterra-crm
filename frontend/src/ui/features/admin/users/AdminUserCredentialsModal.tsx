import { CircleCheck, Copy } from "lucide-react";
import type { TFunction } from "i18next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { message } from "@/lib/toast";
import { AppModal } from "@/ui/shared/components/AppModal";

type Credentials = { name: string; email: string; password: string };

type Props = {
  t: TFunction;
  credentials: Credentials | null;
  onClose: () => void;
};

/** One-time sign-in details screen after creating an account.
    The password is not retrievable later, so the admin copies it here. */
export function AdminUserCredentialsModal({ t, credentials, onClose }: Props) {
  if (!credentials) return null;

  const copyAll = async () => {
    await navigator.clipboard.writeText(`${credentials.email}\n${credentials.password}`);
    message.success(t("admin.credentials.copied"));
  };

  const copyValue = async (value: string) => {
    await navigator.clipboard.writeText(value);
    message.success(t("common.copied"));
  };

  const row = (label: string, value: string) => (
    <div
      className="flex items-center justify-between gap-3 py-2.5"
      style={{ borderBottom: "1px solid var(--ds-border-subtle)" }}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1">
        <span dir="ltr" className="text-[13px]" style={{ fontFamily: "var(--ds-font-family-mono)" }}>
          {value}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={t("common.copyToClipboard")}
          onClick={() => void copyValue(value)}
        >
          <Copy />
        </Button>
      </span>
    </div>
  );

  return (
    <AppModal
      title={
        <span className="inline-flex items-center gap-2">
          <CircleCheck className="size-4" style={{ color: "var(--ds-color-success)" }} />
          {t("admin.credentials.title")}
        </span>
      }
      open
      width={440}
      onCancel={onClose}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Button type="button" variant="outline" onClick={() => void copyAll()}>
            <Copy />
            {t("admin.credentials.copyAll")}
          </Button>
          <Button type="button" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      }
    >
      <span className="mb-1 block text-sm font-semibold">{credentials.name}</span>
      {row(t("admin.form.email"), credentials.email)}
      {row(t("admin.form.password"), credentials.password)}
      <Alert variant="warning" title={t("admin.credentials.note")} className="mt-4" />
    </AppModal>
  );
}
