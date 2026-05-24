import {
  CalendarOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  EyeOutlined,
  MinusCircleOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Space } from "antd";
import { useTranslation } from "react-i18next";
import type { Contract } from "../../../../domain/Contract";
import { TableActionButton } from "../../../shared/components/TableActionButton";

interface Props {
  contract: Contract;
  copiedId: number | null;
  onView: (c: Contract) => void;
  onCopyLink: (c: Contract) => void;
  onCopyPaymentLink: (c: Contract) => void;
  onSubscription: (id: number) => void;
  onSend: (c: Contract) => void;
  onVoid: (c: Contract) => void;
  onDelete: (c: Contract) => void;
}

export function ContractRowActions({
  contract: c,
  copiedId,
  onView,
  onCopyLink,
  onCopyPaymentLink,
  onSubscription,
  onSend,
  onVoid,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const wasCopied = copiedId === c.id;

  return (
    <Space size={4}>
      <TableActionButton
        tooltip={t("admin.contracts.viewDetail")}
        icon={<EyeOutlined />}
        onClick={() => onView(c)}
      />

      {(c.status === "draft" || c.status === "pending_signature") && (
        <TableActionButton
          tooltip={wasCopied ? t("admin.contracts.linkCopied") : t("admin.contracts.copyLink")}
          icon={wasCopied ? <CheckCircleOutlined style={{ color: "#22c55e" }} /> : <CopyOutlined />}
          onClick={() => onCopyLink(c)}
        />
      )}

      {c.status === "signed" && (
        <TableActionButton
          tooltip={wasCopied ? t("admin.contracts.linkCopied") : t("admin.contracts.copyPaymentLink")}
          icon={wasCopied ? <CheckCircleOutlined style={{ color: "#22c55e" }} /> : <CreditCardOutlined />}
          onClick={() => onCopyPaymentLink(c)}
        />
      )}

      {c.status === "signed" && c.monthlyAmount && c.monthlyAmount > 0 && (
        <TableActionButton
          tooltip={t("admin.contracts.subscription.viewStatus")}
          icon={<CalendarOutlined />}
          onClick={() => onSubscription(c.id)}
        />
      )}

      {c.status === "draft" && (
        <TableActionButton
          tooltip={t("admin.contracts.send")}
          icon={<SendOutlined />}
          onClick={() => onSend(c)}
        />
      )}

      {c.status !== "voided" && c.status !== "signed" && (
        <TableActionButton
          tooltip={t("admin.contracts.void")}
          icon={<MinusCircleOutlined />}
          danger
          onClick={() => onVoid(c)}
        />
      )}

      <TableActionButton
        tooltip={t("admin.contracts.delete")}
        icon={<DeleteOutlined />}
        danger
        onClick={() => onDelete(c)}
      />
    </Space>
  );
}
