import type * as React from "react";
import { EllipsisVertical, Lock, Pencil, Trash2 } from "lucide-react";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/button";
import { MenuDropdown, type MenuCompatItemType } from "@/components/ui/menu-compat";
import type { User } from "../../../../domain/User";
import { TableActionButton } from "../../../shared/components/TableActionButton";

interface Props {
  user: User;
  t: TFunction;
  onEdit: (u: User) => void;
  onResetPassword: (u: User) => void;
  onDelete: (u: User) => void;
}

/** Rare per-row actions (reset password, delete) tucked behind a ⋯ overflow menu. */
export function userOverflowMenu(
  user: User,
  t: TFunction,
  onResetPassword: (u: User) => void,
  onDelete: (u: User) => void,
): MenuCompatItemType[] {
  return [
    {
      key: "reset",
      icon: <Lock className="size-4" />,
      label: t("admin.resetPassword"),
      onClick: () => onResetPassword(user),
    },
    {
      key: "delete",
      icon: <Trash2 className="size-4" />,
      danger: true,
      label: t("admin.deleteUser"),
      onClick: () => onDelete(user),
    },
  ];
}

/** ghost ⋯ trigger button shared between the table row and the mobile card view.
    Spreads incoming props/ref so it stays usable as a Radix `asChild` trigger. */
export function UserOverflowTrigger({
  t,
  ...props
}: { t: TFunction } & React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:text-foreground"
      aria-label={t("admin.table.actions")}
      {...props}
    >
      <EllipsisVertical className="size-4" />
    </Button>
  );
}

export function UserRowActions({ user, t, onEdit, onResetPassword, onDelete }: Props) {
  return (
    <div className="flex items-center gap-1">
      <TableActionButton
        tooltip={t("admin.editUser")}
        icon={<Pencil className="size-4" />}
        onClick={() => onEdit(user)}
      />
      <MenuDropdown items={userOverflowMenu(user, t, onResetPassword, onDelete)}>
        <UserOverflowTrigger t={t} />
      </MenuDropdown>
    </div>
  );
}
