import type { CSSProperties, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface OkButtonProps {
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
}

interface AppModalProps {
  open?: boolean;
  title?: ReactNode;
  children?: ReactNode;
  /** Called when the modal is dismissed (X, overlay, Esc, or the Cancel button). */
  onCancel?: () => void;
  onOk?: () => void;
  okText?: ReactNode;
  cancelText?: ReactNode;
  /** Shows a loading state on the default OK button. */
  confirmLoading?: boolean;
  /** `null` hides the footer; a ReactNode (or array) replaces the default footer. */
  footer?: ReactNode;
  width?: number | string;
  centered?: boolean;
  /** Adds max-height + scroll to the modal body. Default: true */
  scrollableBody?: boolean;
  /** Kept for antd-API compatibility — Radix unmounts content on close anyway. */
  destroyOnClose?: boolean;
  /** Kept for antd-API compatibility — Radix unmounts content on close anyway. */
  destroyOnHidden?: boolean;
  okButtonProps?: OkButtonProps;
  /** antd-style style overrides; only `body` is supported. */
  styles?: { body?: CSSProperties };
}

export function AppModal({
  open = false,
  title,
  children,
  onCancel,
  onOk,
  okText,
  cancelText,
  confirmLoading,
  footer,
  width = 600,
  centered: _centered = true,
  scrollableBody = true,
  destroyOnClose: _destroyOnClose,
  destroyOnHidden: _destroyOnHidden,
  okButtonProps,
  styles,
}: AppModalProps) {
  const { t } = useTranslation();

  const bodyStyle: CSSProperties = {
    ...(scrollableBody ? { maxHeight: "68vh", overflowY: "auto" as const } : {}),
    ...styles?.body,
  };

  const hasFooter = footer !== null;
  const footerContent =
    footer !== undefined && footer !== null ? (
      footer
    ) : footer === undefined ? (
      <>
        <Button variant="outline" onClick={onCancel}>
          {cancelText ?? t("common.cancel")}
        </Button>
        <Button
          variant={okButtonProps?.danger ? "destructive" : "default"}
          disabled={okButtonProps?.disabled || confirmLoading || okButtonProps?.loading}
          onClick={onOk}
        >
          {(confirmLoading || okButtonProps?.loading) && (
            <Spinner size="sm" className="text-current" aria-hidden="true" />
          )}
          {okText ?? t("common.ok")}
        </Button>
      </>
    ) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel?.();
      }}
    >
      <DialogContent
        closeLabel={t("common.close")}
        aria-describedby={undefined}
        className="w-[calc(100vw-32px)]"
        style={{ maxWidth: typeof width === "number" ? `min(${width}px, calc(100vw - 32px))` : width }}
      >
        <DialogHeader className={cn(title == null && "sr-only")}>
          <DialogTitle className="pe-8">{title ?? ""}</DialogTitle>
        </DialogHeader>
        <div style={bodyStyle}>{children}</div>
        {hasFooter && footerContent != null ? <DialogFooter>{footerContent}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
