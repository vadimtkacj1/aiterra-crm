import {
  DeleteOutlined,
  DownloadOutlined,
  LinkOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import { Button, Popconfirm, Space, Spin, Table, Tag, Tooltip, Typography } from "antd";
import type { TFunction } from "i18next";
import type {
  AdminService,
  BillingHistoryWithAccountRow,
  UserBusinessMeta,
} from "@/services/admin/AdminService";
import { billingHistoryDeleteErrorMessage } from "./adminPaymentsHistoryDeleteError";
import {
  formatHistoryDateTime,
  formatMoney,
  paymentStatusTag,
} from "./billingUi";

type Props = {
  t: TFunction;
  admin: AdminService;
  message: { success: (c: string) => void; error: (c: string) => void };
  userMeta: UserBusinessMeta | null;
  rows: BillingHistoryWithAccountRow[];
  loading: boolean;
  revokingId: number | null;
  deletingId: number | null;
  setRevokingId: (id: number | null) => void;
  setDeletingId: (id: number | null) => void;
  refreshBillingFormForAccount: (accountId: number) => Promise<void>;
  loadAllBillingHistory: () => Promise<void>;
  downloadRowPdf: (row: BillingHistoryWithAccountRow) => void;
  onOpenPayLink: (row: BillingHistoryWithAccountRow) => void;
};

export function AdminPaymentsHistoryTable({
  t,
  admin,
  message,
  userMeta,
  rows,
  loading,
  revokingId,
  deletingId,
  setRevokingId,
  setDeletingId,
  refreshBillingFormForAccount,
  loadAllBillingHistory,
  downloadRowPdf,
  onOpenPayLink,
}: Props) {
  return (
    <Spin spinning={loading}>
      <Table<BillingHistoryWithAccountRow>
        size="small"
        rowKey={(r) => `${r.accountId}-${r.id}`}
        pagination={{ pageSize: 12, showSizeChanger: false }}
        scroll={{ x: 1100 }}
        locale={{ emptyText: t("admin.payments.historyEmpty") }}
        dataSource={rows}
        columns={[
          {
            title: t("admin.payments.historyColCreated"),
            dataIndex: "createdAt",
            width: 132,
            render: (v: string) => formatHistoryDateTime(v),
          },
          {
            title: t("admin.payments.colBusiness"),
            key: "biz",
            ellipsis: true,
            render: (_, r) => <Typography.Text ellipsis>{r.accountName}</Typography.Text>,
          },
          {
            title: t("admin.payments.colOwner"),
            key: "owner",
            width: 160,
            ellipsis: true,
            render: (_, r) => r.ownerEmail || "—",
          },
          {
            title: t("admin.payments.historyColType"),
            dataIndex: "chargeType",
            width: 96,
            render: (ct: string) =>
              ct === "monthly" ? (
                <Tag color="purple">{t("admin.payments.historyTypeMonthly")}</Tag>
              ) : (
                <Tag color="blue">{t("admin.payments.historyTypeOneTime")}</Tag>
              ),
          },
          {
            title: t("admin.payments.historyColAmount"),
            key: "amount",
            width: 132,
            render: (_, r) => {
              if (r.amount == null) return "—";
              const main = formatMoney(r.amount, r.currency);
              if (
                r.chargeType === "monthly" &&
                r.installmentMonths != null &&
                r.installmentMonths >= 2 &&
                r.installmentTotalAmount != null
              ) {
                return (
                  <div>
                    <Typography.Text strong style={{ fontVariantNumeric: "tabular-nums" }}>
                      {main}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 11 }}>
                      {t("admin.payments.historyInstallmentFootnote", {
                        total: formatMoney(r.installmentTotalAmount, r.currency),
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
            title: t("admin.payments.historyColPayment"),
            key: "paymentStatus",
            width: 100,
            render: (_, r) => paymentStatusTag(t, r.paymentStatus),
          },
          {
            title: t("admin.payments.historyColRecord"),
            dataIndex: "recordStatus",
            width: 88,
            render: (s: string) => {
              if (s === "active") return <Tag color="success">{t("admin.payments.historyStatusActive")}</Tag>;
              if (s === "revoked") return <Tag color="error">{t("admin.payments.historyStatusRevoked")}</Tag>;
              return <Tag>{t("admin.payments.historyStatusSuperseded")}</Tag>;
            },
          },
          {
            title: t("admin.payments.historyColActions"),
            key: "actions",
            width: 200,
            fixed: "right" as const,
            render: (_, r) => (
              <Space size={4} wrap>
                <Tooltip title={t("admin.payments.downloadPdf")}>
                  <Button
                    size="small"
                    type="default"
                    icon={<DownloadOutlined />}
                    onClick={() => downloadRowPdf(r)}
                    disabled={r.amount == null || r.amount <= 0}
                  />
                </Tooltip>
                {r.paymentUrl ? (
                  <Tooltip title={t("admin.payments.payLinkCopy")}>
                    <Button size="small" icon={<LinkOutlined />} onClick={() => onOpenPayLink(r)} />
                  </Tooltip>
                ) : null}
                {r.recordStatus === "active" ? (
                  <Popconfirm
                    title={t("admin.payments.revokeConfirmTitle")}
                    description={t("admin.payments.revokeConfirmDesc")}
                    okText={t("admin.payments.revokeOk")}
                    cancelText={t("common.cancel")}
                    onConfirm={async () => {
                      setRevokingId(r.id);
                      try {
                        await admin.revokeBillingHistoryRow(r.accountId, r.id);
                        message.success(t("admin.payments.revokeSuccess"));
                        await loadAllBillingHistory();
                        if (userMeta?.accountId === r.accountId) {
                          await refreshBillingFormForAccount(r.accountId);
                        }
                      } catch (e) {
                        message.error(e instanceof Error ? e.message : t("errors.generic"));
                      } finally {
                        setRevokingId(null);
                      }
                    }}
                  >
                    <Button size="small" danger icon={<RollbackOutlined />} loading={revokingId === r.id}>
                      {t("admin.payments.revoke")}
                    </Button>
                  </Popconfirm>
                ) : (
                  <Popconfirm
                    title={t("admin.payments.deleteConfirmTitle")}
                    description={t("admin.payments.deleteConfirmDesc")}
                    okText={t("admin.payments.deleteOk")}
                    cancelText={t("common.cancel")}
                    okButtonProps={{ danger: true }}
                    onConfirm={async () => {
                      setDeletingId(r.id);
                      try {
                        await admin.deleteBillingHistoryRow(r.accountId, r.id);
                        message.success(t("admin.payments.deleteSuccess"));
                        await loadAllBillingHistory();
                      } catch (e) {
                        message.error(billingHistoryDeleteErrorMessage(t, e));
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                  >
                    <Button size="small" icon={<DeleteOutlined />} loading={deletingId === r.id}>
                      {t("admin.payments.deleteRow")}
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
      />
    </Spin>
  );
}
