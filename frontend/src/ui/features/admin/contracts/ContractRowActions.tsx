import {
  Calendar,
  Copy,
  CreditCard,
  EllipsisVertical,
  Eye,
  MinusCircle,
  Send,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { MenuDropdown, type MenuCompatItemType } from "@/components/ui/menu-compat";
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

  const items: MenuCompatItemType[] = [];

  if (c.status === "draft" || c.status === "pending_signature") {
    items.push({
      key: "copyLink",
      icon: <Copy className="size-4" />,
      label: wasCopied ? t("admin.contracts.linkCopied") : t("admin.contracts.copyLink"),
      onClick: () => onCopyLink(c),
    });
  }
  if (c.status === "signed") {
    items.push({
      key: "copyPaymentLink",
      icon: <CreditCard className="size-4" />,
      label: wasCopied ? t("admin.contracts.linkCopied") : t("admin.contracts.copyPaymentLink"),
      onClick: () => onCopyPaymentLink(c),
    });
  }
  if (c.status === "signed" && isMonthly) {
    items.push({
      key: "subscription",
      icon: <Calendar className="size-4" />,
      label: t("admin.contracts.subscription.viewStatus"),
      onClick: () => onSubscription(c.id),
    });
  }
  if (c.status === "draft") {
    items.push({
      key: "send",
      icon: <Send className="size-4" />,
      label: t("admin.contracts.send"),
      onClick: () => onSend(c),
    });
  }
  if (items.length > 0) items.push({ type: "divider" });
  if (c.status !== "voided" && c.status !== "signed") {
    items.push({
      key: "void",
      icon: <MinusCircle className="size-4" />,
      label: t("admin.contracts.void"),
      danger: true,
      onClick: () => onVoid(c),
    });
  }
  items.push({
    key: "delete",
    icon: <Trash2 className="size-4" />,
    label: t("admin.contracts.delete"),
    danger: true,
    onClick: () => onDelete(c),
  });

  return (
    <div className="flex items-center gap-1">
      <TableActionButton
        tooltip={t("admin.contracts.viewDetail")}
        icon={<Eye className="size-4" />}
        onClick={() => onView(c)}
      />
      {/* Logical alignment ("start") keeps the menu direction-aware in RTL. */}
      <MenuDropdown items={items}>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          aria-label={t("common.actions")}
        >
          <EllipsisVertical className="size-4" />
        </Button>
      </MenuDropdown>
    </div>
  );
}
