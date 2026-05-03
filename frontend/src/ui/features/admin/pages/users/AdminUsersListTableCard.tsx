import { TeamOutlined } from "@ant-design/icons";
import { Button, Card, Space, Table } from "antd";
import type { TFunction } from "i18next";
import type { User, UserRole } from "@/domain/User";

type Props = {
  t: TFunction;
  users: User[];
  loading: boolean;
  onEdit: (u: User) => void;
  onResetPassword: (u: User) => void;
};

export function AdminUsersListTableCard({ t, users, loading, onEdit, onResetPassword }: Props) {
  return (
    <Card title={<span><TeamOutlined style={{ marginRight: 8 }} />{t("admin.userListTitle")}</span>}>
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
            width: 200,
            render: (_, u: User) => (
              <Space>
                <Button size="small" onClick={() => void onEdit(u)}>
                  {t("admin.editUser")}
                </Button>
                <Button size="small" onClick={() => onResetPassword(u)}>
                  {t("admin.resetPassword")}
                </Button>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  );
}
