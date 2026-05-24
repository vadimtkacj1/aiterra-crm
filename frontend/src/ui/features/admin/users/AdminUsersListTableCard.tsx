import { TeamOutlined, UserAddOutlined } from "@ant-design/icons";
import { Button, Table } from "antd";
import type { TFunction } from "i18next";
import type { User, UserRole } from "@/domain/User";
import { ListCard } from "@/ui/shared/components/ListCard";
import { UserRowActions } from "./UserRowActions";

type Props = {
  t: TFunction;
  users: User[];
  loading: boolean;
  onEdit: (u: User) => void;
  onResetPassword: (u: User) => void;
  onDelete: (u: User) => void;
  onCreateUser: () => void;
};

export function AdminUsersListTableCard({ t, users, loading, onEdit, onResetPassword, onDelete, onCreateUser }: Props) {
  return (
    <ListCard
      icon={<TeamOutlined />}
      title={t("admin.userListTitle")}
      extra={<Button type="primary" icon={<UserAddOutlined />} onClick={onCreateUser}>{t("admin.form.submit")}</Button>}
    >
      <Table
        loading={loading}
        rowKey="id"
        dataSource={users}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        columns={[
          { title: t("admin.table.email"), dataIndex: "email", key: "email", ellipsis: true },
          { title: t("admin.table.displayName"), dataIndex: "displayName", key: "displayName", ellipsis: true },
          {
            title: t("admin.table.role"),
            dataIndex: "role",
            key: "role",
            width: 100,
            render: (role: UserRole) => t(`admin.roles.${role}`),
          },
          {
            title: t("admin.table.actions"),
            key: "actions",
            width: 100,
            render: (_, u: User) => (
              <UserRowActions
                user={u}
                t={t}
                onEdit={onEdit}
                onResetPassword={onResetPassword}
                onDelete={onDelete}
              />
            ),
          },
        ]}
      />
    </ListCard>
  );
}
