import { RefreshCw, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { message } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { AdminAuditLogRow } from "@/services/admin/AdminService";
import { useApp } from "@/app/AppProviders";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ResponsiveCardView, useMobileView } from "../../../shared/components/ResponsiveCardView";

export function AdminAuditPage() {
  const { t } = useTranslation();
  const { services } = useApp();
  const isMobile = useMobileView();
  const [rows, setRows] = useState<AdminAuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await services.admin.listAuditLogs(300);
      setRows(data);
    } catch {
      setRows([]);
      void message.error(t("admin.audit.loadError"));
    } finally {
      setLoading(false);
    }
  }, [services.admin, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.adminEmail, r.action, r.resourceType, r.resourceId, r.detail]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  const emptyState = (
    <EmptyState
      title={search ? t("admin.audit.searchEmpty") : t("admin.audit.emptyTitle")}
      description={search ? undefined : t("admin.audit.emptyDescription")}
      action={
        search
          ? { label: t("admin.audit.clearSearch"), onClick: () => setSearch(""), type: "default" }
          : { label: t("common.reload"), onClick: () => void load(), type: "default" }
      }
    />
  );

  const columns: DataTableColumn<AdminAuditLogRow>[] = [
    {
      title: t("admin.audit.columns.time"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (v) => (
        <span dir="ltr" className="whitespace-nowrap tabular-nums text-muted-foreground">
          {new Date(String(v)).toLocaleString()}
        </span>
      ),
    },
    {
      title: t("admin.audit.columns.admin"),
      key: "admin",
      width: 220,
      render: (_, r) =>
        r.adminEmail ||
        (r.adminUserId != null ? `#${r.adminUserId}` : <span className="text-muted-foreground">—</span>),
    },
    {
      title: t("admin.audit.columns.action"),
      dataIndex: "action",
      key: "action",
      width: 200,
      render: (v) => <span className="font-medium">{v as string}</span>,
    },
    {
      title: t("admin.audit.columns.resource"),
      key: "resource",
      width: 180,
      render: (_, r) => (
        <span className="text-muted-foreground">{r.resourceType || "—"}</span>
      ),
    },
    {
      title: t("admin.audit.columns.detail"),
      dataIndex: "detail",
      key: "detail",
      render: (v) =>
        v ? (
          <span dir="ltr" className="block max-w-[260px] truncate font-mono text-xs text-muted-foreground">
            {v as string}
          </span>
        ) : null,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t("admin.audit.title")}
        description={t("admin.audit.subtitle")}
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? (
              <Spinner size="sm" className="text-current" aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            {!isMobile && t("common.reload")}
          </Button>
        }
      />
      <Card className={cn(isMobile ? "p-3" : "p-4")}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className={cn("relative", isMobile ? "w-full" : "w-[280px]")}>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
              />
              <Input
                className="ps-9 pe-8"
                placeholder={t("admin.audit.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label={t("admin.audit.clearSearch")}
                  onClick={() => setSearch("")}
                  className="absolute inset-y-0 end-2 my-auto flex size-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
          {isMobile ? (
            <ResponsiveCardView
              items={filtered.map((r) => ({
                id: String(r.id),
                title: r.action,
                subtitle: r.adminEmail || (r.adminUserId != null ? `#${r.adminUserId}` : "-"),
                description: new Date(r.createdAt).toLocaleString(),
                tags: r.resourceType ? [{ label: `${r.resourceType} ${r.resourceId || ""}`.trim(), color: "blue" }] : [],
                extra: r.detail ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {r.detail}
                  </div>
                ) : undefined,
              }))}
              loading={loading}
              emptyText={t("common.noData")}
            />
          ) : (
            <DataTable<AdminAuditLogRow>
              rowKey="id"
              loading={loading}
              size="middle"
              pagination={{ pageSize: 25 }}
              dataSource={filtered}
              scroll={{ x: 900 }}
              locale={{ emptyText: emptyState }}
              columns={columns}
              expandable={{
                rowExpandable: (r) => Boolean(r.resourceId || r.detail),
                expandedRowRender: (r) => (
                  <div className="flex flex-col gap-3 py-1">
                    {r.resourceId ? (
                      <div>
                        <span className="block text-xs text-muted-foreground">
                          {t("admin.audit.columns.resource")}
                        </span>
                        <span>{[r.resourceType, r.resourceId].filter(Boolean).join(" ")}</span>
                      </div>
                    ) : null}
                    {r.detail ? (
                      <div>
                        <span className="block text-xs text-muted-foreground">
                          {t("admin.audit.columns.detail")}
                        </span>
                        <span
                          dir="ltr"
                          className="block whitespace-pre-wrap font-mono text-xs [overflow-wrap:anywhere]"
                        >
                          {r.detail}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ),
              }}
            />
          )}
        </div>
      </Card>
    </PageContainer>
  );
}
