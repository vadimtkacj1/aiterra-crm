import { Search, Trash2, UserPlus, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { MenuDropdown } from "@/components/ui/menu-compat";
import { confirm } from "@/lib/confirm";
import type { User, UserRole } from "@/domain/User";
import { EmptyState } from "@/ui/shared/components/EmptyState";
import { UserRowActions, UserOverflowTrigger, userOverflowMenu } from "./UserRowActions";
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
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<string | number>>([]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  // When the list empty-state shows its own primary CTA, demote the toolbar
  // button so the screen keeps a single primary action.
  const emptyCtaVisible = !loading && !search && users.length === 0;

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
    <Card className={isMobile ? "p-3" : "p-4"}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className={`relative ${isMobile ? "w-[180px]" : "w-[280px]"}`}>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-8 pe-8"
            />
            {search && (
              <button
                type="button"
                aria-label={t("common.clear", { defaultValue: "Clear" })}
                onClick={() => setSearch("")}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </div>
          <Button variant={emptyCtaVisible ? "outline" : "default"} onClick={onCreateUser}>
            <UserPlus className="size-4" />
            {!isMobile && t("admin.form.submit")}
          </Button>
        </div>
        {selectedRowKeys.length > 0 && (
          <div className="flex items-center justify-between rounded-(--ds-radius-md) border border-(--ds-color-primary-surface-deep) bg-(--ds-color-primary-surface) px-3 py-2">
            <span className="text-[13px]">
              {t("table.selectedCount", { count: selectedRowKeys.length })}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedRowKeys([])}>
                {t("common.clearSelection")}
              </Button>
              {onDeleteBulk && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    confirm({
                      title: t("admin.users.bulkDeleteConfirmTitle"),
                      content: t("admin.users.bulkDeleteConfirmContent", { count: selectedRowKeys.length }),
                      okText: t("common.confirm"),
                      cancelText: t("common.cancel"),
                      danger: true,
                      onOk: () => {
                        onDeleteBulk(selectedRowKeys.map(Number));
                        setSelectedRowKeys([]);
                      },
                    })
                  }
                >
                  <Trash2 className="size-4" />
                  {t("admin.users.bulkDelete", { count: selectedRowKeys.length })}
                </Button>
              )}
            </div>
          </div>
        )}
        {isMobile ? (
          <ResponsiveCardView
            items={filtered.map((u) => ({
              id: u.id,
              title: u.displayName || u.email,
              subtitle: u.email,
              tags: [{ label: t(`admin.roles.${u.role}`), color: u.role === "admin" ? "purple" : undefined }],
              actions: [
                { label: t("admin.table.edit"), onClick: () => onEdit(u), type: "default" as const },
              ],
              extra: (
                <MenuDropdown items={userOverflowMenu(u, t, onResetPassword, onDelete)}>
                  <UserOverflowTrigger t={t} />
                </MenuDropdown>
              ),
            }))}
            loading={loading}
            emptyText={t("common.noData")}
          />
        ) : (
          <DataTable<User>
            size="middle"
            loading={loading}
            rowKey="id"
            dataSource={filtered}
            locale={{ emptyText: emptyState }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            columns={[
              {
                title: t("admin.table.email"),
                dataIndex: "email",
                key: "email",
                render: (v) => <span className="font-medium">{v as string}</span>,
              },
              {
                title: t("admin.table.displayName"),
                dataIndex: "displayName",
                key: "displayName",
                render: (v) =>
                  (v as string) || <span className="text-muted-foreground">—</span>,
              },
              {
                title: t("admin.table.role"),
                dataIndex: "role",
                key: "role",
                width: 120,
                render: (role) => (
                  <Badge variant={role === "admin" ? "primary" : "default"}>
                    {t(`admin.roles.${role as UserRole}`)}
                  </Badge>
                ),
              },
              {
                title: t("admin.table.actions"),
                key: "actions",
                width: 100,
                render: (_, u) => (
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
      </div>
    </Card>
  );
}
