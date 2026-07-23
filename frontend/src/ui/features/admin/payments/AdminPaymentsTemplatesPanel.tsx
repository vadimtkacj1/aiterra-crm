import { FileText } from "lucide-react";
import type { TFunction } from "i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { confirm } from "@/lib/confirm";
import type { AdminService, InvoiceTemplateRow, UserBusinessMeta } from "@/services/admin/AdminService";
import { EmptyState } from "@/ui/shared/components/EmptyState";
import { formatHistoryDate, formatMoney } from "./billingUi";

type Props = {
  t: TFunction;
  admin: AdminService;
  message: { success: (c: string) => void; error: (c: string) => void };
  userMeta: UserBusinessMeta | null;
  templates: InvoiceTemplateRow[];
  templatesLoading: boolean;
  billBlockedForAdmin: boolean;
  loadTemplateIntoForm: (tpl: InvoiceTemplateRow) => void;
  applyTemplateToSelectedClient: (templateId: number) => Promise<void>;
  loadInvoiceTemplates: () => Promise<void>;
};

export function AdminPaymentsTemplatesPanel({
  t,
  admin,
  message,
  userMeta,
  templates,
  templatesLoading,
  billBlockedForAdmin,
  loadTemplateIntoForm,
  applyTemplateToSelectedClient,
  loadInvoiceTemplates,
}: Props) {
  const confirmDeleteTemplate = (r: InvoiceTemplateRow) =>
    confirm({
      title: t("admin.payments.templateDeleteConfirmTitle"),
      content: t("admin.payments.templateDeleteConfirmDesc"),
      okText: t("admin.payments.deleteOk"),
      cancelText: t("common.cancel"),
      danger: true,
      onOk: async () => {
        try {
          await admin.deleteInvoiceTemplate(r.id);
          message.success(t("admin.payments.templateDeleted"));
          await loadInvoiceTemplates();
        } catch (e) {
          message.error(e instanceof Error ? e.message : t("errors.generic"));
        }
      },
    });

  const columns: DataTableColumn<InvoiceTemplateRow>[] = [
    {
      title: t("admin.payments.templatesColName"),
      key: "title",
      render: (_, r) =>
        r.title?.trim() ? (
          <span className="block truncate font-semibold">{r.title}</span>
        ) : (
          <span className="block truncate text-muted-foreground">
            {t("admin.payments.templatesUntitled")}
          </span>
        ),
    },
    {
      title: t("admin.payments.historyColType"),
      dataIndex: "chargeType",
      width: 110,
      render: (ct) =>
        (ct as string) === "monthly" ? (
          <Badge variant="primary">{t("admin.payments.historyTypeMonthly")}</Badge>
        ) : (
          <Badge variant="processing">{t("admin.payments.historyTypeOneTime")}</Badge>
        ),
    },
    {
      title: t("admin.payments.historyColAmount"),
      key: "amount",
      width: 120,
      render: (_, r) => (
        <div>
          <span className="font-semibold tabular-nums">{formatMoney(r.amount, r.currency)}</span>
          {r.chargeType === "monthly" && r.installmentMonths != null && r.installmentMonths >= 2 ? (
            <span className="block text-[11px] text-muted-foreground">
              {t("admin.payments.templateInstallmentTag", { months: r.installmentMonths })}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      title: t("admin.payments.templatesColCreated"),
      dataIndex: "createdAt",
      width: 150,
      render: (v) => formatHistoryDate(v as string),
    },
    {
      title: t("admin.payments.historyColActions"),
      key: "actions",
      width: 280,
      render: (_, r) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button variant="outline" size="sm" onClick={() => loadTemplateIntoForm(r)}>
            {t("admin.payments.templateLoadForm")}
          </Button>
          <Button
            size="sm"
            disabled={!userMeta?.accountId || billBlockedForAdmin}
            onClick={() => void applyTemplateToSelectedClient(r.id)}
          >
            {t("admin.payments.templateApplyClient")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/40 text-destructive hover:text-destructive"
            onClick={() => confirmDeleteTemplate(r)}
          >
            {t("admin.payments.deleteRow")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Accordion type="single" collapsible defaultValue="templates">
      <AccordionItem value="templates" className="border-b-0">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            <FileText aria-hidden="true" className="size-4" />
            <span>
              {t("admin.payments.templatesCollapse")} ({templates.length})
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          <div className="pt-1">
            {templates.length === 0 && !templatesLoading ? (
              <EmptyState
                title={t("admin.payments.templatesEmpty")}
                description={t("admin.payments.templatesEmptyHint")}
                style={{ padding: "24px 16px" }}
              />
            ) : (
              <DataTable<InvoiceTemplateRow>
                size="small"
                rowKey="id"
                loading={templatesLoading}
                pagination={false}
                dataSource={templates}
                scroll={{ x: 760 }}
                columns={columns}
              />
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
