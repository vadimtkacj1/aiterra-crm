import {
  DeleteOutlined,
  DownloadOutlined,
  FileTextOutlined,
  LinkOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import axios from "axios";
import {
  Button,
  Collapse,
  Divider,
  Drawer,
  Empty,
  Flex,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { FormInstance } from "antd/es/form";
import type { TFunction } from "i18next";
import type { AccountBillingInstruction, AdminService, BillingHistoryWithAccountRow, InvoiceTemplateRow, UserBusinessMeta } from "../../../../../services/AdminService";
import { formatMoney, paymentStatusTag } from "./billingUi";
import type { AdminPaymentsFormValues } from "./types";

type MessageLike = { success: (c: string) => void; error: (c: string) => void };

type Props = {
  t: TFunction;
  open: boolean;
  onClose: () => void;
  afterOpenChange: (open: boolean) => void;
  admin: AdminService;
  message: MessageLike;
  form: FormInstance<AdminPaymentsFormValues>;
  userMeta: UserBusinessMeta | null;
  allBillingRows: BillingHistoryWithAccountRow[];
  allBillingLoading: boolean;
  revokingId: number | null;
  deletingId: number | null;
  setRevokingId: (id: number | null) => void;
  setDeletingId: (id: number | null) => void;
  setClientLiveBilling: (v: AccountBillingInstruction | null) => void;
  loadAllBillingHistory: () => Promise<void>;
  downloadRowPdf: (row: BillingHistoryWithAccountRow) => void;
  invoiceTemplates: InvoiceTemplateRow[];
  templatesLoading: boolean;
  billBlockedForAdmin: boolean;
  loadTemplateIntoForm: (tpl: InvoiceTemplateRow) => void;
  applyTemplateToSelectedClient: (templateId: number) => Promise<void>;
  loadInvoiceTemplates: () => Promise<void>;
};

export function AdminPaymentsLibraryDrawer({
  t,
  open,
  onClose,
  afterOpenChange,
  admin,
  message,
  form,
  userMeta,
  allBillingRows,
  allBillingLoading,
  revokingId,
  deletingId,
  setRevokingId,
  setDeletingId,
  setClientLiveBilling,
  loadAllBillingHistory,
  downloadRowPdf,
  invoiceTemplates,
  templatesLoading,
  billBlockedForAdmin,
  loadTemplateIntoForm,
  applyTemplateToSelectedClient,
  loadInvoiceTemplates,
}: Props) {
  return (
    <Drawer
      title={t("admin.payments.libraryDrawerTitle")}
      placement="right"
      width={720}
      open={open}
      onClose={onClose}
      afterOpenChange={afterOpenChange}
      styles={{ body: { paddingTop: 8, paddingBottom: 24 } }}
    >
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        {t("admin.payments.allInvoicesTitle")}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 10 }}>
        {t("admin.payments.allInvoicesHint")}
      </Typography.Paragraph>
      <Spin spinning={allBillingLoading}>
        <Table<BillingHistoryWithAccountRow>
          size="small"
          rowKey={(r) => `${r.accountId}-${r.id}`}
          pagination={{ pageSize: 12, showSizeChanger: false }}
          scroll={{ x: 1100 }}
          locale={{ emptyText: t("admin.payments.historyEmpty") }}
          dataSource={allBillingRows}
          columns={[
            {
              title: t("admin.payments.historyColCreated"),
              dataIndex: "createdAt",
              width: 132,
              render: (v: string) => {
                try {
                  return new Date(v).toLocaleString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                } catch {
                  return v;
                }
              },
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
              width: 108,
              render: (_, r) => (r.amount != null ? formatMoney(r.amount, r.currency) : "—"),
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
                    <Tooltip title={t("admin.payments.historyOpenPayment")}>
                      <Button
                        size="small"
                        type="link"
                        href={r.paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        icon={<LinkOutlined />}
                      />
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
                            try {
                              const bi = await admin.getAccountBillingInstruction(r.accountId);
                              setClientLiveBilling(bi);
                              const hasLines = Boolean(bi.lineItems && bi.lineItems.length > 0);
                              form.setFieldsValue({
                                chargeType: bi.chargeType,
                                amount: bi.amount ?? undefined,
                                currency: bi.currency || "USD",
                                description: bi.description ?? undefined,
                                useBreakdown: hasLines || bi.chargeType === "none" ? hasLines : true,
                                lineItems: hasLines
                                  ? bi.lineItems!.map((li) => ({
                                      code: li.code,
                                      label: li.label,
                                      amount: li.amount,
                                    }))
                                  : [],
                              });
                            } catch {
                              /* ignore */
                            }
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
                          let msg = t("errors.generic");
                          if (axios.isAxiosError(e)) {
                            const d = e.response?.data as { detail?: unknown } | undefined;
                            const detail = typeof d?.detail === "string" ? d.detail : "";
                            if (detail === "billing_history_delete_revoke_first") {
                              msg = t("admin.payments.deleteNeedRevoke");
                            } else if (detail) {
                              msg = detail;
                            } else if (e.message) {
                              msg = e.message;
                            }
                          } else if (e instanceof Error) {
                            msg = e.message;
                          }
                          message.error(msg);
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
      <Divider style={{ margin: "18px 0" }} />
      <Collapse
        bordered={false}
        style={{ background: "transparent" }}
        defaultActiveKey={[]}
        items={[
          {
            key: "templates",
            label: (
              <Space>
                <FileTextOutlined />
                <span>
                  {t("admin.payments.templatesCollapse")} ({invoiceTemplates.length})
                </span>
              </Space>
            ),
            children: (
              <div style={{ paddingTop: 4 }}>
                <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 0, marginBottom: 12 }}>
                  {t("admin.payments.templatesIntroShort")}
                </Typography.Paragraph>
                {invoiceTemplates.length === 0 && !templatesLoading ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    styles={{ image: { height: 40, opacity: 0.75 } }}
                    description={
                      <Flex vertical align="center" gap={4}>
                        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                          {t("admin.payments.templatesEmpty")}
                        </Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {t("admin.payments.templatesEmptyHint")}
                        </Typography.Text>
                      </Flex>
                    }
                  />
                ) : (
                  <Table<InvoiceTemplateRow>
                    size="small"
                    rowKey="id"
                    loading={templatesLoading}
                    pagination={false}
                    dataSource={invoiceTemplates}
                    scroll={{ x: 760 }}
                    columns={[
                      {
                        title: t("admin.payments.templatesColName"),
                        key: "title",
                        ellipsis: true,
                        render: (_, r) =>
                          r.title?.trim() ? (
                            <Typography.Text strong>{r.title}</Typography.Text>
                          ) : (
                            <Typography.Text type="secondary">{t("admin.payments.templatesUntitled")}</Typography.Text>
                          ),
                      },
                      {
                        title: t("admin.payments.historyColType"),
                        dataIndex: "chargeType",
                        width: 110,
                        render: (ct: string) =>
                          ct === "monthly" ? (
                            <Tag color="purple" style={{ borderRadius: 6, margin: 0 }}>
                              {t("admin.payments.historyTypeMonthly")}
                            </Tag>
                          ) : (
                            <Tag color="blue" style={{ borderRadius: 6, margin: 0 }}>
                              {t("admin.payments.historyTypeOneTime")}
                            </Tag>
                          ),
                      },
                      {
                        title: t("admin.payments.historyColAmount"),
                        key: "amount",
                        width: 120,
                        render: (_, r) => (
                          <Typography.Text style={{ fontVariantNumeric: "tabular-nums" }} strong>
                            {formatMoney(r.amount, r.currency)}
                          </Typography.Text>
                        ),
                      },
                      {
                        title: t("admin.payments.templatesColCreated"),
                        dataIndex: "createdAt",
                        width: 150,
                        render: (v: string) => {
                          try {
                            return new Date(v).toLocaleString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            });
                          } catch {
                            return v;
                          }
                        },
                      },
                      {
                        title: t("admin.payments.historyColActions"),
                        key: "actions",
                        width: 280,
                        fixed: "right" as const,
                        render: (_, r) => (
                          <Flex gap={6} wrap="wrap" justify="flex-end">
                            <Button size="small" onClick={() => loadTemplateIntoForm(r)}>
                              {t("admin.payments.templateLoadForm")}
                            </Button>
                            <Button
                              size="small"
                              type="primary"
                              disabled={!userMeta?.accountId || billBlockedForAdmin}
                              onClick={() => void applyTemplateToSelectedClient(r.id)}
                            >
                              {t("admin.payments.templateApplyClient")}
                            </Button>
                            <Popconfirm
                              title={t("admin.payments.templateDeleteConfirmTitle")}
                              description={t("admin.payments.templateDeleteConfirmDesc")}
                              okText={t("admin.payments.deleteOk")}
                              cancelText={t("common.cancel")}
                              onConfirm={async () => {
                                try {
                                  await admin.deleteInvoiceTemplate(r.id);
                                  message.success(t("admin.payments.templateDeleted"));
                                  await loadInvoiceTemplates();
                                } catch (e) {
                                  message.error(e instanceof Error ? e.message : t("errors.generic"));
                                }
                              }}
                            >
                              <Button size="small" danger>
                                {t("admin.payments.deleteRow")}
                              </Button>
                            </Popconfirm>
                          </Flex>
                        ),
                      },
                    ]}
                  />
                )}
              </div>
            ),
          },
        ]}
      />
    </Drawer>
  );
}
