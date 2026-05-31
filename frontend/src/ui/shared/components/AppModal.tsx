import { Modal } from "antd";
import type { ModalProps } from "antd";
import type { CSSProperties } from "react";

type AppModalProps = ModalProps & {
  /** Adds max-height + scroll to the modal body. Default: true */
  scrollableBody?: boolean;
};

export function AppModal({
  destroyOnClose: _destroyOnClose,
  width = 600,
  scrollableBody = true,
  ...props
}: AppModalProps) {
  const bodyStyle: CSSProperties = {
    paddingTop: 8,
    ...(scrollableBody ? { maxHeight: "70vh", overflowY: "auto" } : {}),
  };

  return (
    <Modal
      destroyOnHidden
      width={width}
      styles={{ body: bodyStyle }}
      {...props}
    />
  );
}
