import { Modal, Button } from "antd";
import type { TFunction } from "i18next";

interface ConfirmButtonProps {
  onConfirm: () => void | Promise<void>;
  t: TFunction;
  title?: string;
  content?: string;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
  children: React.ReactNode;
  buttonType?: "primary" | "default" | "dashed" | "link" | "text";
  buttonSize?: "small" | "middle" | "large";
  buttonIcon?: React.ReactNode;
}

export function ConfirmButton({
  onConfirm,
  t,
  title,
  content,
  okText,
  cancelText,
  danger = false,
  children,
  buttonType = "default",
  buttonSize = "middle",
  buttonIcon,
}: ConfirmButtonProps) {
  const handleClick = () => {
    Modal.confirm({
      title: title || t("common.confirm"),
      content: content || t("common.confirmAction"),
      okText: okText || t("common.ok"),
      cancelText: cancelText || t("common.cancel"),
      okType: danger ? "danger" : "primary",
      onOk: async () => {
        await onConfirm();
      },
    });
  };

  return (
    <Button
      type={buttonType}
      size={buttonSize}
      icon={buttonIcon}
      danger={danger}
      onClick={handleClick}
    >
      {children}
    </Button>
  );
}
