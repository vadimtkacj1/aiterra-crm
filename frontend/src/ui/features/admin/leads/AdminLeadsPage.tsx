import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminAccountRow } from "@/services/admin/AdminService";
import type { SiteLeadAdmin } from "@/domain/Site";
import { useApp } from "@/app/AppProviders";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { message } from "@/lib/toast";
import { EmptyState } from "../../../shared/components/EmptyState";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";
import { ResponsiveCardView, useMobileView } from "../../../shared/components/ResponsiveCardView";

/** Sentinel for the "no account filter" select option (Radix Select has no allowClear). */
const ALL_ACCOUNTS = "__all__";

/** Isolate LTR data (phone, email, dates, URLs) so it doesn't bidi-reorder inside an RTL cell. */
function Ltr({ children }: { children: React.ReactNode }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: "isolate", fontVariantNumeric: "tabular-nums" }}>
      {children}
    </span>
  );
}

/** Shorten a source URL for display (hostname + path, or file name for file: URLs). */
function sourceLabel(v: string): string {
  try {
    const url = new URL(v);
    if (url.protocol === "file:") {
      return url.pathname.split("/").filter(Boolean).pop() ?? v;
    }
    return url.hostname + (url.pathname !== "/" ? url.pathname : "");
  } catch {
    return v;
  }
}

export function AdminLeadsPage() {
  const { t } = useTranslation();
  const { services } = useApp();
  const isMobile = useMobileView();

  const [leads, setLeads] = useState<SiteLeadAdmin[]>([]);
  const [accounts, setAccounts] = useState<AdminAccountRow[]>([]);
  const [filterAccountId, setFilterAccountId] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await services.admin.listAccounts();
      setAccounts(data);
    } catch {
      /* non-critical */
    }
  }, [services.admin]);

  const load = useCallback(async (accountId?: number) => {
    setLoading(true);
    try {
      const data = await services.admin.listAllLeads(accountId);
      setLeads(data);
    } catch {
      message.error(t("admin.leads.loadError"));
    } finally {
      setLoading(false);
    }
  }, [services.admin, t]);

  useEffect(() => {
    void loadAccounts();
    void load();
  }, [loadAccounts, load]);

  function onAccountFilter(value: number | undefined) {
    setFilterAccountId(value);
    void load(value);
  }

  const columns: DataTableColumn<SiteLeadAdmin>[] = [
    {
      title: t("admin.leads.colAccount"),
      key: "account",
      width: 160,
      render: (_, r) => (
        <span className="font-medium">{r.accountName}</span>
      ),
    },
    {
      title: t("admin.leads.colName"),
      dataIndex: "name",
      key: "name",
      width: 150,
    },
    {
      title: t("admin.leads.colPhone"),
      dataIndex: "phone",
      key: "phone",
      render: (v) => (v ? <Ltr>{v as string}</Ltr> : <span className="text-muted-foreground">—</span>),
      width: 130,
    },
    {
      title: t("admin.leads.colEmail"),
      dataIndex: "email",
      key: "email",
      render: (v) => (v ? <Ltr>{v as string}</Ltr> : <span className="text-muted-foreground">—</span>),
      width: 200,
      responsive: ["xl"],
    },
    {
      title: t("admin.leads.colMessage"),
      dataIndex: "message",
      key: "message",
      width: 260,
      render: (v) =>
        v ? (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block max-w-[260px] cursor-default truncate">{v as string}</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[400px] whitespace-pre-wrap">
                {v as string}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      title: t("admin.leads.colDate"),
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v) => (
        <span className="whitespace-nowrap text-muted-foreground">
          <Ltr>{new Date(v as string).toLocaleString()}</Ltr>
        </span>
      ),
      width: 155,
    },
  ];

  const emptyState = (
    <EmptyState
      title={t("admin.leads.empty")}
      description={t("admin.leads.emptyDesc")}
      action={
        filterAccountId != null
          ? { label: t("admin.leads.clearFilter"), onClick: () => onAccountFilter(undefined), type: "default" }
          : undefined
      }
    />
  );

  return (
    <PageContainer>
      <PageHeader
        title={t("admin.leads.title")}
        subtitle={t("admin.leads.subtitle")}
        actions={
          <Button variant="outline" onClick={() => void load(filterAccountId)} disabled={loading}>
            {loading ? (
              <Spinner size="sm" className="text-current" aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
            {!isMobile && t("common.reload")}
          </Button>
        }
      />
      <Card className={isMobile ? "p-3" : "p-4"}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filterAccountId != null ? String(filterAccountId) : ALL_ACCOUNTS}
              onValueChange={(v) => onAccountFilter(v === ALL_ACCOUNTS ? undefined : Number(v))}
            >
              <SelectTrigger className={isMobile ? "w-[180px]" : "w-[240px]"}>
                <SelectValue placeholder={t("admin.leads.filterAccount")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ACCOUNTS}>{t("admin.leads.filterAll")}</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isMobile ? (
            <ResponsiveCardView
              items={leads.map((lead) => ({
                id: lead.id,
                title: lead.name,
                subtitle: lead.accountName,
                description: lead.message || undefined,
                tags: [
                  ...(lead.phone ? [{ label: lead.phone }] : []),
                  ...(lead.email ? [{ label: lead.email }] : []),
                ],
                extra: (
                  <span className="text-xs text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </span>
                ),
              }))}
              loading={loading}
              emptyText={t("admin.leads.empty")}
            />
          ) : (
            <DataTable<SiteLeadAdmin>
              size="middle"
              loading={loading}
              dataSource={leads}
              columns={columns}
              rowKey="id"
              locale={{ emptyText: emptyState }}
              expandable={{
                rowExpandable: (r) => Boolean(r.message || r.treatment || r.source),
                expandedRowRender: (r) => (
                  <div className="flex flex-col gap-3 py-1">
                    {r.message && (
                      <div>
                        <span className="block text-xs text-muted-foreground">
                          {t("admin.leads.colMessage")}
                        </span>
                        <span className="whitespace-pre-wrap">{r.message}</span>
                      </div>
                    )}
                    {r.treatment && (
                      <div>
                        <span className="block text-xs text-muted-foreground">
                          {t("admin.leads.colTreatment")}
                        </span>
                        <span>{r.treatment}</span>
                      </div>
                    )}
                    {r.source && (
                      <div>
                        <span className="block text-xs text-muted-foreground">
                          {t("admin.leads.colSource")}
                        </span>
                        <a
                          href={r.source}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          <Ltr>{sourceLabel(r.source)}</Ltr>
                        </a>
                      </div>
                    )}
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
