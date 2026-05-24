import {
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  PlusOutlined,
  RollbackOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../../../app/AppProviders";
import type { BillingHistoryWithAccountRow } from "../../../../services/admin/AdminService";
import { ListCard } from "../../../shared/components/ListCard";
import { PageContainer } from "../../../shared/components/PageContainer";
import { PageHeader } from "../../../shared/components/PageHeader";
import { downloadInvoicePdf } from "../../../shared/utils/invoicePdf";
import { ResponsiveCardView, useMobileView } from "../../../shared/components/ResponsiveCardView";

function fmtMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "ILS").toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

interface CreateFormValues {
  userId: string;
  chargeType: "one_time" | "monthly";
  amount: number;
  currency: string;
  description?: string;
}

export function AdminInvoicesPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { services, users } = useApp();
  const isMobile = useMobileView();

  const [invoices, setInvoices] = useState<BillingHistoryWithAccountRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form] = Form.useForm<CreateFormValues>();

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

  const handleCreate = async (values: CreateFormValues) => {
    const user = users.find((u) => String(u.id) === values.userId);
    if (!user?.accountId) {
      void message.error(t("admin.payments.noBusiness"));
      return;
    }

    setCreating(true);
    try {
      await services.admin.setAccountBillingInstruction(user.accountId, {
        chargeType: values.chargeType,
        amount: values.amount,
        currency: values.currency,
        description: values.description?.trim() || null,
        lineItems: null,
        splitAcrossMonths: null,
      });
      void message.success(t("admin.invoices.createModal.success"));
      setCreateOpen(false);
      form.resetFields();
      reload();
    } catch (e) {
      void message.error(e instanceof Error ? e.message : t("admin.invoices.createModal.error"));
    } finally {
      setCreating(false);
    }
  };

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
      render: (v: string) => new Date(v).toLocaleDateString(),
    },
    {
      title: t("admin.invoices.table.business"),
      dataIndex: "accountName",
      key: "accountName",
      ellipsis: true,
    },
    {
      title: t("admin.invoices.table.owner"),
      dataIndex: "ownerEmail",
      key: "ownerEmail",
      width: 180,
      ellipsis: true,
      render: (v: string | null) => v || "-",
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
      render: (_, r) => {
        if (r.amount == null) return "-";
        const main = fmtMoney(r.amount, r.currency);
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
                  total: fmtMoney(r.installmentTotalAmount, r.currency),
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
      dataIndex: "paymentStatus",
      key: "paymentStatus",
      width: 100,
      render: (s: string) => {
        if (s === "paid") return <Tag color="success">{t("admin.invoices.paymentPaid")}</Tag>;
        if (s === "pending") return <Tag color="warning">{t("admin.invoices.paymentPending")}</Tag>;
        return <Tag color="default">{t("admin.invoices.paymentUnpaid")}</Tag>;
      },
    },
    {
      title: t("admin.invoices.table.recordStatus"),
      dataIndex: "recordStatus",
      key: "recordStatus",
      width: 100,
      render: (s: string) => {
        if (s === "active") return <Tag color="success">{t("admin.invoices.statusActive")}</Tag>;
        if (s === "revoked") return <Tag color="error">{t("admin.invoices.statusRevoked")}</Tag>;
        return <Tag>{t("admin.invoices.statusSuperseded")}</Tag>;
      },
    },
    {
      title: t("admin.invoices.table.actions"),
      key: "actions",
      width: 200,
      fixed: "right",
      render: (_, r) => (
        <Space size={4}>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => downloadPdf(r)}
            disabled={r.amount == null || r.amount <= 0}
            title={t("admin.invoices.downloadPdf")}
          />
          {r.recordStatus === "active" ? (
            <Popconfirm
              title={t("admin.invoices.revokeConfirm")}
              onConfirm={() => void handleRevoke(r)}
              okText={t("common.ok")}
              cancelText={t("common.cancel")}
            >
              <Button
                size="small"
                danger
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
      <PageHeader title={t("admin.invoices.title")} subtitle={t("admin.invoices.subtitle")} />

      <ListCard
        icon={<DollarOutlined />}
        title={t("admin.invoices.title")}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            {!isMobile && t("admin.invoices.createButton")}
          </Button>
        }
      >
        {isMobile ? (
          <ResponsiveCardView
            items={invoices.map((r) => ({
              id: `${r.accountId}-${r.id}`,
              title: r.accountName,
              subtitle: r.ownerEmail || "-",
              description: new Date(r.createdAt).toLocaleDateString(),
              tags: [
                {
                  label: r.chargeType === "monthly" ? t("admin.invoices.typeMonthly") : t("admin.invoices.typeOneTime"),
                  color: r.chargeType === "monthly" ? "purple" : "blue",
                },
                {
                  label: r.paymentStatus === "paid" ? t("admin.invoices.paymentPaid") : t("admin.invoices.paymentUnpaid"),
                  color: r.paymentStatus === "paid" ? "success" : "default",
                },
                {
                  label: r.recordStatus === "active" ? t("admin.invoices.statusActive") : r.recordStatus === "revoked" ? t("admin.invoices.statusRevoked") : t("admin.invoices.statusSuperseded"),
                  color: r.recordStatus === "active" ? "success" : r.recordStatus === "revoked" ? "error" : "default",
                },
              ],
              extra: (
                <div style={{ textAlign: "right" }}>
                  <Typography.Text strong style={{ fontSize: 14 }}>
                    {r.amount != null ? fmtMoney(r.amount, r.currency) : "-"}
                  </Typography.Text>
                  {r.chargeType === "monthly" && r.installmentMonths != null && r.installmentMonths >= 2 && r.installmentTotalAmount != null && (
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 10 }}>
                      {t("admin.invoices.installmentNote", {
                        total: fmtMoney(r.installmentTotalAmount, r.currency),
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
                      danger: true,
                    }]
                  : [{
                      label: t("admin.invoices.delete"),
                      onClick: () => void handleDelete(r),
                      danger: true,
                    }]),
              ],
            }))}
            loading={loading}
            emptyText={t("admin.invoices.empty")}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={invoices}
            rowKey={(r) => `${r.accountId}-${r.id}`}
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: true }}
            scroll={{ x: 1100 }}
            locale={{ emptyText: t("admin.invoices.empty") }}
          />
        )}
      </ListCard>

      {/* Create Modal */}
      <Modal
        title={t("admin.invoices.createModal.title")}
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={520}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ chargeType: "one_time", currency: "ILS" }}
          onFinish={(values) => void handleCreate(values)}
        >
          <Form.Item
            name="userId"
            label={t("admin.invoices.createModal.selectUser")}
            rules={[{ required: true }]}
          >
            <Select
              size="large"
              showSearch
              placeholder={t("admin.invoices.createModal.selectUserPlaceholder")}
              filterOption={(input, opt) => {
                const q = input.toLowerCase();
                const label = (opt?.label as string ?? "").toLowerCase();
                return label.includes(q);
              }}
              options={users
                .filter((u) => u.role !== "admin" && u.accountId != null)
                .map((u) => ({
                  value: String(u.id),
                  label: `${u.displayName} (${u.email})`,
                }))}
            />
          </Form.Item>

          <Form.Item
            name="chargeType"
            label={t("admin.invoices.createModal.chargeType")}
            rules={[{ required: true }]}
          >
            <Select size="large">
              <Select.Option value="one_time">{t("admin.invoices.createModal.chargeTypeOneTime")}</Select.Option>
              <Select.Option value="monthly">{t("admin.invoices.createModal.chargeTypeMonthly")}</Select.Option>
            </Select>
          </Form.Item>

          <Row gutter={12}>
            <Col flex="auto">
              <Form.Item
                name="amount"
                label={t("admin.invoices.createModal.amount")}
                rules={[{ required: true, type: "number", min: 0.01 }]}
              >
                <InputNumber size="large" min={0.01} style={{ width: "100%" }} placeholder="0.00" />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item name="currency" label={t("admin.invoices.createModal.currency")}>
                <Select size="large" style={{ width: 100 }}>
                  <Select.Option value="ILS">ILS</Select.Option>
                  <Select.Option value="USD">USD</Select.Option>
                  <Select.Option value="EUR">EUR</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label={t("admin.invoices.createModal.description")}>
            <Input.TextArea
              rows={3}
              placeholder={t("admin.invoices.createModal.descriptionPlaceholder")}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={() => {
                setCreateOpen(false);
                form.resetFields();
              }}>
                {t("admin.invoices.createModal.cancel")}
              </Button>
              <Button type="primary" htmlType="submit" loading={creating}>
                {t("admin.invoices.createModal.submit")}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
