import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { confirm } from "@/lib/confirm";
import { cn } from "@/lib/utils";

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

const VARIANT_BY_TYPE = {
  primary: "default",
  default: "outline",
  dashed: "outline",
  link: "link",
  text: "ghost",
} as const;

const SIZE_BY_SIZE = {
  small: "sm",
  middle: "default",
  large: "lg",
} as const;

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
    confirm({
      title: title || t("common.confirm"),
      content: content || t("common.confirmAction"),
      okText: okText || t("common.ok"),
      cancelText: cancelText || t("common.cancel"),
      danger,
      onOk: async () => {
        await onConfirm();
      },
    });
  };

  const variant =
    danger && buttonType === "primary" ? "destructive" : VARIANT_BY_TYPE[buttonType];

  return (
    <Button
      variant={variant}
      size={SIZE_BY_SIZE[buttonSize]}
      className={cn(danger && buttonType !== "primary" && "text-destructive hover:text-destructive")}
      onClick={handleClick}
    >
      {buttonIcon}
      {children}
    </Button>
  );
}
