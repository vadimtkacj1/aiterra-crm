import {
  DeleteOutlined,
  DownloadOutlined,
  PlusOutlined,
  RollbackOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { EmptyState } from "../../../shared/components/EmptyState";
import {
  App,
  Button,
  Card,
  Flex,
  Input,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../../../app/AppProviders";
import type { BillingHistoryWithAccountRow } from "../../../../services/admin/AdminService";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";
import { downloadInvoicePdf } from "../../../shared/utils/invoicePdf";
import { ResponsiveCardView, useMobileView } from "../../../shared/components/ResponsiveCardView";
import { formatHistoryDateTime, formatMoney, paymentStatusTag } from "../payments/billingUi";

export function AdminInvoicesPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { services } = useApp();
  const isMobile = useMobileView();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<BillingHistoryWithAccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (r) =>
        (r.accountName ?? "").toLowerCase().includes(q) ||
        (r.ownerEmail ?? "").toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }, [invoices, search]);

  const reload = () => {
    setLoading(true);
    services.admin
      .listAllBillingHistory()
      .then(setInvoices)
      .catch(() => void message.error(t("admin.invoices.loadError")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRevoke = async (row: BillingHistoryWithAccountRow) => {
    setRevokingId(row.id);
    try {
      await services.admin.revokeBillingHistoryRow(row.accountId, row.id);
      void message.success(t("admin.invoices.revokeSuccess"));
      reload();
    } catch (e) {
      void message.error(e instanceof Error ? e.message : t("errors.generic"));
    } finally {
      setRevokingId(null);
    }
  };

  const handleDelete = async (row: BillingHistoryWithAccountRow) => {
    setDeletingId(row.id);
    try {
      await services.admin.deleteBillingHistoryRow(row.accountId, row.id);
      void message.success(t("admin.invoices.deleteSuccess"));
      reload();
    } catch (e) {
      void message.error(e instanceof Error ? e.message : t("errors.generic"));
    } finally {
      setDeletingId(null);
    }
  };

  const downloadPdf = (row: BillingHistoryWithAccountRow) => {
    downloadInvoicePdf({
      invoiceId: `inv_${row.accountId}_${row.id}`,
      amount: row.amount ?? 0,
      currency: row.currency,
      status: row.paymentStatus,
      description: row.description,
      chargeType: row.chargeType,
      accountId: row.accountId,
      customerName: row.ownerEmail || row.accountName || undefined,
      lineItems: row.lineItems?.map((li) => ({ code: li.code ?? "", label: li.label, amount: li.amount })),
      createdAt: row.createdAt,
      installmentMonths: row.installmentMonths ?? undefined,
      installmentTotalAmount: row.installmentTotalAmount ?? undefined,
    });
  };

  const columns: ColumnsType<BillingHistoryWithAccountRow> = [
    {
      title: t("admin.invoices.table.created"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 140,
      onCell: () => ({ style: { fontVariantNumeric: "tabular-nums" } }),
      render: (v: string) => formatHistoryDateTime(v),
    },
    {
      title: t("admin.invoices.table.business"),
      key: "accountName",
      ellipsis: true,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600 }}>{r.accountName}</div>
          {r.ownerEmail && (
            <div style={{ fontSize: 12, color: "var(--ds-text-tertiary)" }}>{r.ownerEmail}</div>
          )}
        </div>
      ),
    },
    {
      title: t("admin.invoices.table.type"),
      dataIndex: "chargeType",
      key: "chargeType",
      width: 110,
      render: (ct: string) =>
        ct === "monthly" ? (
          <Tag color="purple">{t("admin.invoices.typeMonthly")}</Tag>
        ) : (
          <Tag color="blue">{t("admin.invoices.typeOneTime")}</Tag>
        ),
    },
    {
      title: t("admin.invoices.table.amount"),
      key: "amount",
      width: 140,
      onCell: () => ({ style: { fontVariantNumeric: "tabular-nums" } }),
      render: (_, r) => {
        if (r.amount == null) return "-";
        const main = formatMoney(r.amount, r.currency || "ILS");
        if (
          r.chargeType === "monthly" &&
          r.installmentMonths != null &&
          r.installmentMonths >= 2 &&
          r.installmentTotalAmount != null
        ) {
          return (
            <div>
              <Typography.Text strong>{main}</Typography.Text>
              <Typography.Text type="secondary" style={{ display: "block", fontSize: 11 }}>
                {t("admin.invoices.installmentNote", {
                  total: formatMoney(r.installmentTotalAmount, r.currency || "ILS"),
                  months: r.installmentMonths,
                })}
              </Typography.Text>
            </div>
          );
        }
        return main;
      },
    },
    {
      title: t("admin.invoices.table.paymentStatus"),
      key: "paymentStatus",
      width: 160,
      render: (_, r) => (
        <Space size={4} wrap>
          {paymentStatusTag(t, r.paymentStatus)}
          {r.recordStatus === "revoked" && (
            <Tag style={{ fontSize: 11 }}>{t("admin.invoices.statusRevoked")}</Tag>
          )}
          {r.recordStatus !== "active" && r.recordStatus !== "revoked" && (
            <Tag style={{ fontSize: 11 }}>{t("admin.invoices.statusSuperseded")}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: t("admin.invoices.table.actions"),
      key: "actions",
      width: 150,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title={t("admin.invoices.downloadPdf")}>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => downloadPdf(r)}
              disabled={r.amount == null || r.amount <= 0}
            />
          </Tooltip>
          {r.recordStatus === "active" ? (
            <Popconfirm
              title={t("admin.invoices.revokeConfirm")}
              description={t("admin.invoices.revokeConfirmDesc")}
              onConfirm={() => void handleRevoke(r)}
              okText={t("admin.invoices.revokeOk")}
              okButtonProps={{ danger: true }}
              cancelText={t("common.cancel")}
            >
              <Button
                size="small"
                icon={<RollbackOutlined />}
                loading={revokingId === r.id}
              >
                {t("admin.invoices.revoke")}
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title={t("admin.invoices.deleteConfirm")}
              onConfirm={() => void handleDelete(r)}
              okText={t("common.ok")}
              cancelText={t("common.cancel")}
              okButtonProps={{ danger: true }}
            >
              <Button size="small" icon={<DeleteOutlined />} loading={deletingId === r.id}>
                {t("admin.invoices.delete")}
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t("admin.invoices.title")}
        subtitle={t("admin.invoices.subtitle")}
      />

      <Card styles={{ body: { padding: isMobile ? 12 : 16 } }}>
        <Flex
          align="center"
          justify="space-between"
          gap={8}
          wrap="wrap"
          style={{ marginBottom: 16 }}
        >
          <Input
            prefix={<SearchOutlined />}
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: isMobile ? 160 : 280 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/admin/payments")}>
            {!isMobile && t("admin.invoices.createButton")}
          </Button>
        </Flex>
        {isMobile ? (
          <ResponsiveCardView
            items={filtered.map((r) => ({
              id: `${r.accountId}-${r.id}`,
              title: r.accountName,
              subtitle: r.ownerEmail || "-",
              description: formatHistoryDateTime(r.createdAt),
              tags: [
                {
                  label: r.chargeType === "monthly" ? t("admin.invoices.typeMonthly") : t("admin.invoices.typeOneTime"),
                  color: r.chargeType === "monthly" ? "purple" : "blue",
                },
                paymentStatusTag(t, r.paymentStatus),
                ...(r.recordStatus !== "active"
                  ? [{
                      label: r.recordStatus === "revoked" ? t("admin.invoices.statusRevoked") : t("admin.invoices.statusSuperseded"),
                      color: "default",
                    }]
                  : []),
              ],
              extra: (
                <div style={{ textAlign: "end" }}>
                  <Typography.Text strong style={{ fontSize: 14 }}>
                    {r.amount != null ? formatMoney(r.amount, r.currency || "ILS") : "-"}
                  </Typography.Text>
                  {r.chargeType === "monthly" && r.installmentMonths != null && r.installmentMonths >= 2 && r.installmentTotalAmount != null && (
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 10 }}>
                      {t("admin.invoices.installmentNote", {
                        total: formatMoney(r.installmentTotalAmount, r.currency || "ILS"),
                        months: r.installmentMonths,
                      })}
                    </Typography.Text>
                  )}
                </div>
              ),
              actions: [
                {
                  label: t("admin.invoices.downloadPdf"),
                  onClick: () => downloadPdf(r),
                  icon: <DownloadOutlined />,
                  type: "default" as const,
                },
                ...(r.recordStatus === "active"
                  ? [{
                      label: t("admin.invoices.revoke"),
                      onClick: () => void handleRevoke(r),
                    }]
                  : [{
                      label: t("admin.invoices.delete"),
                      onClick: () => void handleDelete(r),
                      danger: true,
                    }]),
              ],
            }))}
            loading={loading}
            emptyText={t("admin.invoices.emptyTitle")}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filtered}
            rowKey={(r) => `${r.accountId}-${r.id}`}
            loading={loading}
            size="middle"
            pagination={{ pageSize: 20, showSizeChanger: true }}
            scroll={{ x: 900 }}
            locale={{
              emptyText: search ? (
                <EmptyState title={t("common.noData")} />
              ) : (
                <EmptyState
                  title={t("admin.invoices.emptyTitle")}
                  description={t("admin.invoices.emptyDescription")}
                  action={{ label: t("admin.invoices.createButton"), onClick: () => navigate("/admin/payments") }}
                />
              ),
            }}
          />
        )}
      </Card>
    </PageContainer>
  );
}
