import { DeleteOutlined, EditOutlined, LockOutlined, MoreOutlined } from "@ant-design/icons";
import { Button, Dropdown, Space } from "antd";
import type { MenuProps } from "antd";
import type { TFunction } from "i18next";
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
): MenuProps {
  return {
    items: [
      { key: "reset", icon: <LockOutlined />, label: t("admin.resetPassword") },
      { key: "delete", icon: <DeleteOutlined />, danger: true, label: t("admin.deleteUser") },
    ],
    onClick: ({ key }) => {
      if (key === "reset") onResetPassword(user);
      if (key === "delete") onDelete(user);
    },
  };
}

export function UserRowActions({ user, t, onEdit, onResetPassword, onDelete }: Props) {
  return (
    <Space size={4}>
      <TableActionButton
        tooltip={t("admin.editUser")}
        icon={<EditOutlined />}
        onClick={() => onEdit(user)}
      />
      <Dropdown trigger={["click"]} menu={userOverflowMenu(user, t, onResetPassword, onDelete)}>
        <Button type="text" size="small" icon={<MoreOutlined />} />
      </Dropdown>
    </Space>
  );
}
