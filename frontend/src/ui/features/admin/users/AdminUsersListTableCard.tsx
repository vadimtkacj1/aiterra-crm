import { DeleteOutlined, SearchOutlined, UserAddOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Input, Popconfirm, Typography } from "antd";
import { useMemo, useState } from "react";
import type { Key } from "react";
import { AppTable } from "@/ui/shared/components/AppTable";
import type { TFunction } from "i18next";
import type { User, UserRole } from "@/domain/User";
import { EmptyState } from "@/ui/shared/components/EmptyState";
import { UserRowActions } from "./UserRowActions";
import { ResponsiveCardView, useMobileView } from "@/ui/shared/components/ResponsiveCardView";

type Props = {
  t: TFunction;
  users: User[];
  loading: boolean;
  onEdit: (u: User) => void;
  onResetPassword: (u: User) => void;
  onDelete: (u: User) => void;
  onDeleteBulk?: (ids: number[]) => void;
  onCreateUser: () => void;
};

export function AdminUsersListTableCard({ t, users, loading, onEdit, onResetPassword, onDelete, onDeleteBulk, onCreateUser }: Props) {
  const isMobile = useMobileView();
  const [search, setSearch] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  const emptyState = (
    <EmptyState
      title={search ? t("admin.users.searchEmpty") : t("admin.users.listEmpty")}
      description={search ? t("admin.users.searchEmptyDesc") : t("admin.users.listEmptyDesc")}
      action={
        !search
          ? { label: t("admin.form.submit"), onClick: onCreateUser, type: "primary" }
          : undefined
      }
    />
  );

  return (
    <Card styles={{ body: { padding: isMobile ? 12 : 16 } }}>
      <Flex vertical gap={16}>
        <Flex align="center" justify="space-between" gap={8} wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: isMobile ? 180 : 280 }}
          />
          <Button type="primary" icon={<UserAddOutlined />} onClick={onCreateUser}>
            {!isMobile && t("admin.form.submit")}
          </Button>
        </Flex>
        {selectedRowKeys.length > 0 && (
          <Flex
            align="center"
            justify="space-between"
            style={{
              padding: "8px 12px",
              background: "var(--ds-color-primary-surface)",
              border: "1px solid var(--ds-color-primary-surface-deep)",
              borderRadius: "var(--ds-radius-md)",
            }}
          >
            <Typography.Text style={{ fontSize: 13 }}>
              {t("table.selectedCount", { count: selectedRowKeys.length })}
            </Typography.Text>
            <Flex gap={8}>
              <Button size="small" onClick={() => setSelectedRowKeys([])}>
                {t("common.clearSelection")}
              </Button>
              {onDeleteBulk && (
                <Popconfirm
                  title={t("admin.users.bulkDeleteConfirmTitle")}
                  description={t("admin.users.bulkDeleteConfirmContent", { count: selectedRowKeys.length })}
                  okText={t("common.confirm")}
                  cancelText={t("common.cancel")}
                  okButtonProps={{ danger: true }}
                  onConfirm={() => {
                    onDeleteBulk(selectedRowKeys.map(Number));
                    setSelectedRowKeys([]);
                  }}
                >
                  <Button size="small" danger icon={<DeleteOutlined />}>
                    {t("admin.users.bulkDelete", { count: selectedRowKeys.length })}
                  </Button>
                </Popconfirm>
              )}
            </Flex>
          </Flex>
        )}
        {isMobile ? (
          <ResponsiveCardView
            items={filtered.map((u) => ({
              id: u.id,
              title: u.displayName || u.email,
              subtitle: u.email,
              tags: [{ label: t(`admin.roles.${u.role}`), color: u.role === "admin" ? "red" : "blue" }],
              actions: [
                { label: t("admin.table.edit"), onClick: () => onEdit(u), type: "default" as const },
                { label: t("admin.table.resetPassword"), onClick: () => onResetPassword(u), type: "default" as const },
                { label: t("admin.table.delete"), onClick: () => onDelete(u), danger: true },
              ],
            }))}
            loading={loading}
            emptyText={t("common.noData")}
          />
        ) : (
          <AppTable
            size="middle"
            loading={loading}
            rowKey="id"
            dataSource={filtered}
            locale={{ emptyText: emptyState }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              preserveSelectedRowKeys: true,
            }}
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
        )}
      </Flex>
    </Card>
  );
}
