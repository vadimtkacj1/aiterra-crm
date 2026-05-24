import { DeleteOutlined, EditOutlined, LockOutlined } from "@ant-design/icons";
import { Space } from "antd";
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

export function UserRowActions({ user, t, onEdit, onResetPassword, onDelete }: Props) {
  return (
    <Space size={4}>
      <TableActionButton
        tooltip={t("admin.editUser")}
        icon={<EditOutlined />}
        onClick={() => onEdit(user)}
      />
      <TableActionButton
        tooltip={t("admin.resetPassword")}
        icon={<LockOutlined />}
        onClick={() => onResetPassword(user)}
      />
      <TableActionButton
        tooltip={t("admin.deleteUser")}
        icon={<DeleteOutlined />}
        danger
        onClick={() => onDelete(user)}
      />
    </Space>
  );
}
