import { Modal } from "antd";
import type { ModalProps } from "antd";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

type AppModalProps = ModalProps & {
  /** Adds max-height + scroll to the modal body. Default: true */
  scrollableBody?: boolean;
};

export function AppModal({
  destroyOnClose: _destroyOnClose,
  width = 600,
  scrollableBody = true,
  centered = true,
  cancelText,
  ...props
}: AppModalProps) {
  const { t } = useTranslation();
  const bodyStyle: CSSProperties = scrollableBody
    ? { maxHeight: "68vh", overflowY: "auto" }
    : {};

  return (
    <Modal
      destroyOnHidden
      centered={centered}
      width={width}
      cancelText={cancelText ?? t("common.cancel")}
      styles={{ body: bodyStyle }}
      {...props}
    />
  );
}
