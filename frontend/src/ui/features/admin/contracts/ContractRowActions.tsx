import {
  CalendarOutlined,
  CopyOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  EyeOutlined,
  MinusCircleOutlined,
  MoreOutlined,
  SendOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Space } from "antd";
import type { MenuProps } from "antd";
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

/**
 * One direct action (View) plus an overflow menu for the rest — keeps the table
 * row to two controls instead of up to eight competing icons.
 */
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
  const isMonthly = Boolean(c.monthlyAmount && c.monthlyAmount > 0);

  const items: MenuProps["items"] = [];

  if (c.status === "draft" || c.status === "pending_signature") {
    items.push({
      key: "copyLink",
      icon: <CopyOutlined />,
      label: wasCopied ? t("admin.contracts.linkCopied") : t("admin.contracts.copyLink"),
      onClick: () => onCopyLink(c),
    });
  }
  if (c.status === "signed") {
    items.push({
      key: "copyPaymentLink",
      icon: <CreditCardOutlined />,
      label: wasCopied ? t("admin.contracts.linkCopied") : t("admin.contracts.copyPaymentLink"),
      onClick: () => onCopyPaymentLink(c),
    });
  }
  if (c.status === "signed" && isMonthly) {
    items.push({
      key: "subscription",
      icon: <CalendarOutlined />,
      label: t("admin.contracts.subscription.viewStatus"),
      onClick: () => onSubscription(c.id),
    });
  }
  if (c.status === "draft") {
    items.push({
      key: "send",
      icon: <SendOutlined />,
      label: t("admin.contracts.send"),
      onClick: () => onSend(c),
    });
  }
  if (items.length > 0) items.push({ type: "divider" });
  if (c.status !== "voided" && c.status !== "signed") {
    items.push({
      key: "void",
      icon: <MinusCircleOutlined />,
      label: t("admin.contracts.void"),
      danger: true,
      onClick: () => onVoid(c),
    });
  }
  items.push({
    key: "delete",
    icon: <DeleteOutlined />,
    label: t("admin.contracts.delete"),
    danger: true,
    onClick: () => onDelete(c),
  });

  return (
    <Space size={4}>
      <TableActionButton
        tooltip={t("admin.contracts.viewDetail")}
        icon={<EyeOutlined />}
        onClick={() => onView(c)}
      />
      {/* No explicit placement — antd picks the direction-aware default, keeping RTL correct */}
      <Dropdown menu={{ items }} trigger={["click"]}>
        <Button type="text" size="small" icon={<MoreOutlined />} aria-label={t("common.actions")} />
      </Dropdown>
    </Space>
  );
}
