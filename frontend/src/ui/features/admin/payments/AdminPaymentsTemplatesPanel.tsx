import { FileTextOutlined } from "@ant-design/icons";
import { Button, Collapse, Empty, Flex, Popconfirm, Space, Table, Tag, Typography } from "antd";
import type { TFunction } from "i18next";
import type { AdminService, InvoiceTemplateRow, UserBusinessMeta } from "@/services/admin/AdminService";
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
  return (
    <Collapse
      bordered={false}
      style={{ background: "transparent" }}
      defaultActiveKey={["templates"]}
      items={[
        {
          key: "templates",
          label: (
            <Space>
              <FileTextOutlined />
              <span>
                {t("admin.payments.templatesCollapse")} ({templates.length})
              </span>
            </Space>
          ),
          children: (
            <div style={{ paddingTop: 4 }}>
              {templates.length === 0 && !templatesLoading ? (
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
                  dataSource={templates}
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
                        <div>
                          <Typography.Text style={{ fontVariantNumeric: "tabular-nums" }} strong>
                            {formatMoney(r.amount, r.currency)}
                          </Typography.Text>
                          {r.chargeType === "monthly" && r.installmentMonths != null && r.installmentMonths >= 2 ? (
                            <Typography.Text type="secondary" style={{ display: "block", fontSize: 11 }}>
                              {t("admin.payments.templateInstallmentTag", { months: r.installmentMonths })}
                            </Typography.Text>
                          ) : null}
                        </div>
                      ),
                    },
                    {
                      title: t("admin.payments.templatesColCreated"),
                      dataIndex: "createdAt",
                      width: 150,
                      render: (v: string) => formatHistoryDate(v),
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
  );
}
