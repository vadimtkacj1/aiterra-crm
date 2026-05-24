import { EditOutlined, LockOutlined } from "@ant-design/icons";
import { Space } from "antd";
import type { TFunction } from "i18next";
import type { User } from "../../../../domain/User";
import { TableActionButton } from "../../../shared/components/TableActionButton";

interface Props {
  user: User;
  t: TFunction;
  onEdit: (u: User) => void;
  onResetPassword: (u: User) => void;
}

export function UserRowActions({ user, t, onEdit, onResetPassword }: Props) {
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
    </Space>
  );
}
