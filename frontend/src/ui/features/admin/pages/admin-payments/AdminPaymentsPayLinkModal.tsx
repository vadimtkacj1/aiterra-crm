import { CheckOutlined, LinkOutlined } from "@ant-design/icons";
import { Button, Flex, Input, Modal, Typography } from "antd";
import type { TFunction } from "i18next";

type Props = {
  t: TFunction;
  url: string | null;
  copied: boolean;
  onClose: () => void;
  onCopy: () => void;
};

export function AdminPaymentsPayLinkModal({ t, url, copied, onClose, onCopy }: Props) {
  return (
    <Modal
      title={
        <Flex align="center" gap={8}>
          <LinkOutlined />
          {t("admin.payments.payLinkModalTitle")}
        </Flex>
      }
      open={Boolean(url)}
      onCancel={onClose}
      footer={
        <Flex justify="flex-end" gap={8}>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="primary" icon={copied ? <CheckOutlined /> : <LinkOutlined />} onClick={onCopy}>
            {copied ? t("admin.payments.payLinkCopied") : t("admin.payments.payLinkCopy")}
          </Button>
        </Flex>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        {t("admin.payments.payLinkModalHint")}
      </Typography.Paragraph>
      <Input readOnly value={url ?? ""} style={{ fontFamily: "monospace", fontSize: 13 }} />
    </Modal>
  );
}
