import {
  CheckCircleOutlined,
  ContainerOutlined,
  CopyOutlined,
  CreditCardOutlined,
  FilePdfOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  SyncOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Col,
  Descriptions,
  Flex,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import { AppModal } from "../../../shared/components/AppModal";
import { ListCard } from "../../../shared/components/ListCard";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Contract } from "../../../../domain/Contract";
import { useApp } from "../../../../app/AppProviders";
import { renderContractBody } from "../../user/contracts/components/contractBodyRenderer";
import { PageContainer } from "../../../shared/components/PageContainer";
import { SubscriptionStatusModal } from "./SubscriptionStatusModal";
import { ContractRowActions } from "./ContractRowActions";
import { SubscriptionPaymentHistory } from "../../user/subscriptions/components/SubscriptionPaymentHistory";
import type { SubscriptionStatus } from "../../../../services/admin/AdminService";
import { ResponsiveCardView, useMobileView } from "../../../shared/components/ResponsiveCardView";

// ─── helpers ────────────────────────────────────────────────────────────────

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

function statusCfg(status: Contract["status"]) {
  const map: Record<string, [string, string]> = {
    draft: ["default", "admin.contracts.status.draft"],
    pending_signature: ["processing", "admin.contracts.status.pending_signature"],
    signed: ["success", "admin.contracts.status.signed"],
    voided: ["error", "admin.contracts.status.voided"],
  };
  return map[status] ?? ["default", status];
}

function stageCfg(status: string) {
  const map: Record<string, [string, string]> = {
    pending: ["default", "admin.contracts.stageStatus.pending"],
    invoiced: ["processing", "admin.contracts.stageStatus.invoiced"],
    paid: ["success", "admin.contracts.stageStatus.paid"],
  };
  return map[status] ?? ["default", status];
}

function getPaidCount(c: Contract) {
  return c.stages.filter((s) => s.status === "paid").length;
}
function getPaidAmount(c: Contract) {
  return c.stages.filter((s) => s.status === "paid").reduce((sum, s) => sum + (s.amount ?? 0), 0);
}

function splitEqual(totalMajor: number, count: number): number[] {
  if (count < 1 || totalMajor <= 0) return [];
  const cents = Math.round(totalMajor * 100);
  const base = Math.floor(cents / count);
  let rem = cents - base * count;
  return Array.from({ length: count }, () => {
    const add = rem > 0 ? 1 : 0;
    if (rem > 0) rem -= 1;
    return (base + add) / 100;
  });
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      resolve(r.includes(",") ? r.split(",")[1] : r);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── types ──────────────────────────────────────────────────────────────────

interface StageRow {
  description: string;
  amount: number | null;
}

interface FormValues {
  accountId: number;
  title: string;
  body: string;
  currency: string;
  stages: StageRow[];
  isSubscription: boolean;
  monthlyAmount?: number | null;
  subscriptionMonths?: number | null;
  billingDay?: number | null;
}

// ─── component ──────────────────────────────────────────────────────────────

export function AdminContractsPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { services, users } = useApp();
  const isMobile = useMobileView();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detailContract, setDetailContract] = useState<Contract | null>(null);
  const [subscriptionContractId, setSubscriptionContractId] = useState<number | null>(null);
  const [detailSubStatus, setDetailSubStatus] = useState<SubscriptionStatus | null>(null);
  const [expandedPayments, setExpandedPayments] = useState<Record<number, SubscriptionStatus>>({});
  const [expandedLoading, setExpandedLoading] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [splitTotal, setSplitTotal] = useState<number | null>(null);
  const [splitParts, setSplitParts] = useState<number>(2);
  const [form] = Form.useForm<FormValues>();

  const reload = () => {
    setLoading(true);
    services.admin
      .listContracts()
      .then(setContracts)
      .catch(() => void message.error(t("errors.generic")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRowExpand = (expanded: boolean, contract: Contract) => {
    if (!expanded || !contract.monthlyAmount || contract.monthlyAmount <= 0) return;
    if (expandedPayments[contract.id]) return;
    setExpandedLoading((prev) => ({ ...prev, [contract.id]: true }));
    services.admin
      .getContractSubscriptionStatus(contract.id)
      .then((status) => setExpandedPayments((prev) => ({ ...prev, [contract.id]: status })))
      .catch(() => {})
      .finally(() => setExpandedLoading((prev) => ({ ...prev, [contract.id]: false })));
  };

  useEffect(() => {
    if (detailContract?.monthlyAmount && detailContract.monthlyAmount > 0) {
      services.admin
        .getContractSubscriptionStatus(detailContract.id)
        .then(setDetailSubStatus)
        .catch(() => setDetailSubStatus(null));
    } else {
      setDetailSubStatus(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailContract?.id]);

  const signUrl = (c: Contract) => `${window.location.origin}/contracts/sign/${c.signToken}`;
  const paymentUrl = signUrl;

  const copyLink = async (c: Contract) => {
    await navigator.clipboard.writeText(signUrl(c));
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyPaymentLink = async (c: Contract) => {
    await navigator.clipboard.writeText(paymentUrl(c));
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (c: Contract) => {
    try {
      const updated = await services.admin.sendContract(c.id);
      setContracts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      void message.success(t("admin.contracts.sentSuccess"));
    } catch (e) {
      void message.error(e instanceof Error ? e.message : t("errors.generic"));
    }
  };

  const handleVoid = (c: Contract) => {
    Modal.confirm({
      title: t("admin.contracts.voidConfirmTitle"),
      content: t("admin.contracts.voidConfirmContent"),
      okType: "danger",
      onOk: async () => {
        try {
          const updated = await services.admin.voidContract(c.id);
          setContracts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
          void message.success(t("admin.contracts.voidedSuccess"));
        } catch (e) {
          void message.error(e instanceof Error ? e.message : t("errors.generic"));
        }
      },
    });
  };

  const handleQuickTest = (contractId: number) => {
    Modal.confirm({
      title: t("admin.contracts.subscription.quickTestConfirmTitle"),
      content: t("admin.contracts.subscription.quickTestConfirmContent"),
      okText: t("admin.contracts.subscription.quickTestConfirmOk"),
      onOk: async () => {
        try {
          await services.admin.setTestInterval(contractId, 10);
          void message.success(t("admin.contracts.subscription.quickTestStarted"));
        } catch (e: unknown) {
          const detail =
            (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          void message.error(detail ?? (e instanceof Error ? e.message : t("errors.generic")));
        }
      },
    });
  };

  const handleDelete = (c: Contract) => {
    Modal.confirm({
      title: t("admin.contracts.deleteConfirmTitle"),
      content: t("admin.contracts.deleteConfirmContent"),
      okType: "danger",
      onOk: async () => {
        try {
          await services.admin.deleteContract(c.id);
          setContracts((prev) => prev.filter((x) => x.id !== c.id));
          void message.success(t("admin.contracts.deletedSuccess"));
        } catch (e) {
          void message.error(e instanceof Error ? e.message : t("errors.generic"));
        }
      },
    });
  };

  const resetCreateForm = () => {
    setCreateOpen(false);
    form.resetFields();
    setPdfBase64(null);
    setPdfFileName(null);
    setSplitTotal(null);
    setSplitParts(2);
  };

  const applyEqualSplit = () => {
    if (splitTotal == null || splitTotal <= 0 || splitParts < 2) {
      void message.warning(t("admin.contracts.form.equalSplitInvalid"));
      return;
    }
    const doApply = () => {
      const amounts = splitEqual(splitTotal!, splitParts);
      form.setFieldsValue({
        stages: amounts.map((amount, i) => ({
          description: t("admin.contracts.form.equalStageLabel", { current: i + 1, total: splitParts }),
          amount,
        })),
      });
      void message.success(t("admin.contracts.form.equalSplitApplied"));
    };
    const currentStages: StageRow[] = form.getFieldValue("stages") ?? [];
    const hasData = currentStages.some((s) => s.description?.trim() || (s.amount && s.amount > 0));
    if (hasData) {
      Modal.confirm({
        title: t("admin.contracts.form.equalSplitConfirmTitle"),
        content: t("admin.contracts.form.equalSplitConfirmContent"),
        okText: t("admin.contracts.form.equalSplitConfirmOk"),
        onOk: doApply,
      });
    } else {
      doApply();
    }
  };

  const handleCreate = async (values: FormValues) => {
    // For subscriptions, stages are auto-generated on backend
    if (values.isSubscription) {
      if (!values.monthlyAmount || values.monthlyAmount <= 0) {
        void message.error(t("admin.contracts.form.monthlyAmountRequired"));
        return;
      }
      setCreating(true);
      try {
        const created = await services.admin.createContract({
          accountId: values.accountId,
          title: values.title,
          body: values.body ?? "",
          currency: values.currency ?? "ILS",
          pdfBase64: pdfBase64 ?? null,
          stages: [], // Backend will generate stages
          isSubscription: true,
          monthlyAmount: values.monthlyAmount,
          subscriptionMonths: values.subscriptionMonths || null,
          billingDay: values.billingDay || null,
        });
        setContracts((prev) => [created, ...prev]);
        resetCreateForm();
        void message.success(t("admin.contracts.createdSuccess"));
      } catch (e) {
        void message.error(e instanceof Error ? e.message : t("errors.generic"));
      } finally {
        setCreating(false);
      }
      return;
    }

    // For one-time payments, validate manual stages
    const validStages = (values.stages ?? []).filter(
      (s) => s.description?.trim() && s.amount && s.amount > 0,
    );
    if (!validStages.length) {
      void message.error(t("admin.contracts.form.stagesRequired"));
      return;
    }
    setCreating(true);
    try {
      const created = await services.admin.createContract({
        accountId: values.accountId,
        title: values.title,
        body: values.body ?? "",
        currency: values.currency ?? "ILS",
        pdfBase64: pdfBase64 ?? null,
        stages: validStages as { description: string; amount: number }[],
        isSubscription: false,
        monthlyAmount: null,
        subscriptionMonths: null,
      });
      setContracts((prev) => [created, ...prev]);
      resetCreateForm();
      void message.success(t("admin.contracts.createdSuccess"));
    } catch (e) {
      void message.error(e instanceof Error ? e.message : t("errors.generic"));
    } finally {
      setCreating(false);
    }
  };

  // ─── table ────────────────────────────────────────────────────────────────

  const columns: ColumnsType<Contract> = [
    {
      title: "#",
      dataIndex: "id",
      key: "id",
      width: 60,
      render: (id: number) => (
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>#{id}</Typography.Text>
      ),
    },
    {
      title: t("admin.contracts.columns.account"),
      key: "account",
      render: (_, r) => {
        const u = users.find((x) => x.accountId === r.accountId);
        return (
          <div>
            <div style={{ fontWeight: 600 }}>{u?.displayName || `Account #${r.accountId}`}</div>
            {u?.email && <div style={{ fontSize: 12, color: "#94a3b8" }}>{u.email}</div>}
          </div>
        );
      },
    },
    {
      title: t("admin.contracts.columns.title"),
      key: "title",
      render: (_, r) => (
        <div>
          <Typography.Text strong>{r.title}</Typography.Text>
          {r.monthlyAmount && r.monthlyAmount > 0 && (
            <div style={{ marginTop: 3 }}>
              <Tag color="blue" style={{ fontSize: 11 }}>
                {t("admin.contracts.subscriptionTag", {
                  amount: fmtMoney(r.monthlyAmount, r.currency),
                  months: r.subscriptionMonths || "∞",
                })}
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: t("admin.contracts.columns.total"),
      key: "total",
      align: "right" as const,
      render: (_, r) => {
        const paidCount = getPaidCount(r);
        const total = r.stages.length;
        const paidAmt = getPaidAmount(r);
        return (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600 }}>{fmtMoney(r.totalAmount, r.currency)}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
              {paidCount === total && total > 0
                ? t("admin.contracts.installmentsTag.paid", { paid: paidCount, total })
                : paidCount === 0
                ? t("admin.contracts.installmentsTag.unpaid")
                : `${fmtMoney(paidAmt, r.currency)} ${t("admin.contracts.installmentsTag.partial", { paid: paidCount, total })}`}
            </div>
          </div>
        );
      },
    },
    {
      title: t("admin.contracts.columns.status"),
      key: "status",
      width: 150,
      render: (_, r) => {
        const [color, key] = statusCfg(r.status);
        return (
          <div>
            <Tag color={color}>{t(key)}</Tag>
            {r.signedAt && (
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
                {new Date(r.signedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 185,
      render: (_, r) => (
        <ContractRowActions
          contract={r}
          copiedId={copiedId}
          onView={setDetailContract}
          onCopyLink={(c) => void copyLink(c)}
          onCopyPaymentLink={(c) => void copyPaymentLink(c)}
          onSubscription={setSubscriptionContractId}
          onQuickTest={handleQuickTest}
          onSend={(c) => void handleSend(c)}
          onVoid={handleVoid}
          onDelete={handleDelete}
        />
      ),
    },
  ];

  // ─── create modal ─────────────────────────────────────────────────────────

  const createFooter = (
    <Flex justify="space-between" align="center">
      <Button onClick={resetCreateForm}>{t("common.cancel")}</Button>
      <Button
        type="primary"
        loading={creating}
        onClick={() => void form.validateFields().then(handleCreate)}
      >
        {t("admin.contracts.form.submit")}
      </Button>
    </Flex>
  );

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <ListCard
        icon={<ContainerOutlined />}
        title={t("admin.contracts.title")}
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            {!isMobile && t("admin.contracts.create")}
            {isMobile && <PlusOutlined />}
          </Button>
        }
      >
        {isMobile ? (
          <ResponsiveCardView
            items={contracts.map((c) => {
              const u = users.find((x) => x.accountId === c.accountId);
              const [statusColor, statusKey] = statusCfg(c.status);
              const paidCount = getPaidCount(c);
              const total = c.stages.length;

              return {
                id: c.id,
                title: c.title,
                subtitle: u?.displayName || `Account #${c.accountId}`,
                description: u?.email,
                tags: [
                  { label: t(statusKey), color: statusColor },
                  ...(c.monthlyAmount && c.monthlyAmount > 0
                    ? [{
                        label: t("admin.contracts.subscriptionTag", {
                          amount: fmtMoney(c.monthlyAmount, c.currency),
                          months: c.subscriptionMonths || "∞",
                        }),
                        color: "blue",
                      }]
                    : []),
                ],
                extra: (
                  <div style={{ textAlign: "right" }}>
                    <Typography.Text strong style={{ fontSize: 14 }}>
                      {fmtMoney(c.totalAmount, c.currency)}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ display: "block", fontSize: 11 }}>
                      {paidCount === total && total > 0
                        ? t("admin.contracts.installmentsTag.paid", { paid: paidCount, total })
                        : paidCount === 0
                        ? t("admin.contracts.installmentsTag.unpaid")
                        : `${paidCount}/${total}`}
                    </Typography.Text>
                  </div>
                ),
                actions: [
                  {
                    label: t("common.view"),
                    onClick: () => setDetailContract(c),
                    type: "default" as const,
                  },
                ],
              };
            })}
            loading={loading}
            emptyText={t("common.noData")}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={contracts}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (n) => `${n} contracts` }}
            expandable={{
              rowExpandable: (c) => !!(c.monthlyAmount && c.monthlyAmount > 0),
              onExpand: handleRowExpand,
              expandedRowRender: (c) => {
                const status = expandedPayments[c.id];
                const isLoading = expandedLoading[c.id];
                return (
                  <div style={{ padding: "8px 16px 16px" }}>
                    {isLoading ? (
                      <Spin size="small" />
                    ) : !status || status.payments.length === 0 ? (
                      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                        No payment history yet.
                      </Typography.Text>
                    ) : (
                      <SubscriptionPaymentHistory payments={status.payments} t={t} />
                    )}
                  </div>
                );
              },
            }}
          />
        )}
      </ListCard>

      {/* ── Create modal ──────────────────────────────────────── */}
      <AppModal
        title={t("admin.contracts.create")}
        open={createOpen}
        onCancel={resetCreateForm}
        width={isMobile ? "100%" : 720}
        footer={createFooter}
        styles={isMobile ? { body: { maxHeight: "70vh", overflowY: "auto" } } : undefined}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ currency: "ILS", stages: [{ description: "", amount: null }], isSubscription: false }}
        >
          {/* ── Step 1: Client ─────────────────────────────────── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", background: "var(--ds-color-primary)",
                color: "#fff", fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>1</div>
              <Typography.Text strong style={{ fontSize: 13, color: "var(--ds-text-primary)" }}>
                {t("admin.contracts.form.selectClient")}
              </Typography.Text>
            </div>
            <Form.Item
              name="accountId"
              rules={[{ required: true }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                size="large"
                showSearch
                placeholder={t("admin.contracts.form.accountPlaceholder")}
                filterOption={(input, opt) => {
                  const q = input.toLowerCase();
                  const label = ((opt?.label as string) ?? "").toLowerCase();
                  const email = ((opt?.email as string) ?? "").toLowerCase();
                  return label.includes(q) || email.includes(q);
                }}
                optionRender={(opt) => (
                  <div style={{ padding: "2px 0" }}>
                    <div style={{ fontWeight: 500 }}>{opt.data.label}</div>
                    <div style={{ fontSize: 12, color: "var(--ds-text-tertiary)" }}>{opt.data.email}</div>
                  </div>
                )}
                options={users
                  .filter((u) => u.role !== "admin" && u.accountId != null && u.accountId > 0)
                  .map((u) => ({
                    value: u.accountId as number,
                    label: u.displayName || u.email,
                    email: u.email,
                  }))}
              />
            </Form.Item>
          </div>

          {/* ── Step 2: Contract Details ────────────────────────── */}
          <div
            style={{
              padding: "16px",
              background: "var(--ds-surface-1)",
              border: "1px solid var(--ds-border-subtle)",
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", background: "var(--ds-color-primary)",
                color: "#fff", fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>2</div>
              <Typography.Text strong style={{ fontSize: 13, color: "var(--ds-text-primary)" }}>
                {t("admin.contracts.form.contractDetails")}
              </Typography.Text>
            </div>

            <Row gutter={12}>
              <Col flex="auto">
                <Form.Item name="title" label={t("admin.contracts.form.title")} rules={[{ required: true }]}>
                  <Input size="large" placeholder={t("admin.contracts.form.titlePlaceholder")} />
                </Form.Item>
              </Col>
              <Col>
                <Form.Item name="currency" label={t("admin.contracts.form.currency")}>
                  <Select
                    size="large"
                    style={{ width: 96 }}
                    options={[{ value: "ILS" }, { value: "USD" }, { value: "EUR" }]}
                  />
                </Form.Item>
              </Col>
            </Row>

            {!pdfBase64 && (
              <Form.Item
                name="body"
                label={t("admin.contracts.form.body")}
                extra={
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {t("admin.contracts.form.bodyFormatHint")}
                  </Typography.Text>
                }
              >
                <Input.TextArea
                  rows={4}
                  placeholder={t("admin.contracts.form.bodyPlaceholder")}
                  style={{ fontFamily: "monospace", fontSize: 13 }}
                />
              </Form.Item>
            )}

            {/* PDF upload */}
            <Form.Item label={t("admin.contracts.form.pdf")} style={{ marginBottom: 0 }}>
              {pdfFileName ? (
                <Flex align="center" gap={8}
                  style={{
                    padding: "8px 12px",
                    background: "var(--ds-color-primary-surface)",
                    border: "1px solid var(--ds-color-primary-surface-deep)",
                    borderRadius: 6,
                  }}
                >
                  <FilePdfOutlined style={{ color: "var(--ds-color-primary)", fontSize: 16, flexShrink: 0 }} />
                  <Typography.Text
                    ellipsis
                    style={{ flex: 1, fontSize: 13, color: "var(--ds-text-primary)" }}
                    title={pdfFileName}
                  >
                    {pdfFileName}
                  </Typography.Text>
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<MinusCircleOutlined />}
                    onClick={() => { setPdfBase64(null); setPdfFileName(null); }}
                    style={{ flexShrink: 0 }}
                  />
                </Flex>
              ) : (
                <Upload
                  accept=".pdf"
                  maxCount={1}
                  showUploadList={false}
                  beforeUpload={(file) => {
                    if (file.size > 5 * 1024 * 1024) {
                      void message.error(t("admin.contracts.form.pdfSizeError"));
                      return false;
                    }
                    readFileAsBase64(file)
                      .then((b64) => {
                        setPdfBase64(b64);
                        setPdfFileName(file.name);
                        form.setFieldsValue({ body: "" });
                      })
                      .catch(() => void message.error(t("errors.generic")));
                    return false;
                  }}
                >
                  <Button icon={<FilePdfOutlined />}>
                    {t("admin.contracts.form.pdfUpload")}
                  </Button>
                </Upload>
              )}
            </Form.Item>
          </div>

          {/* ── Step 3: Payment Type ─────────────────────────────── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", background: "var(--ds-color-primary)",
                color: "#fff", fontSize: 11, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>3</div>
              <Typography.Text strong style={{ fontSize: 13, color: "var(--ds-text-primary)" }}>
                {t("admin.contracts.form.paymentStages")}
              </Typography.Text>
            </div>

            {/* ── Payment type selector cards ───────────────────── */}
            <Form.Item noStyle shouldUpdate={(prev, curr) =>
              prev.isSubscription !== curr.isSubscription ||
              prev.monthlyAmount !== curr.monthlyAmount ||
              prev.subscriptionMonths !== curr.subscriptionMonths ||
              prev.billingDay !== curr.billingDay ||
              prev.stages !== curr.stages ||
              prev.currency !== curr.currency
            }>
              {({ getFieldValue }) => {
                const isSubscription = getFieldValue("isSubscription") as boolean;
                const currency: string = getFieldValue("currency") ?? "ILS";

                const cardBase: React.CSSProperties = {
                  position: "relative",
                  cursor: "pointer",
                  padding: "14px 16px",
                  borderRadius: 8,
                  border: "1px solid var(--ds-border-subtle)",
                  background: "var(--ds-surface-0)",
                  transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
                  userSelect: "none",
                };
                const cardActive: React.CSSProperties = {
                  border: "1px solid var(--ds-color-primary)",
                  background: "var(--ds-color-primary-surface)",
                  boxShadow: "var(--ds-shadow-focus)",
                };

                return (
                  <>
                    {/* Type cards */}
                    <Row gutter={10} style={{ marginBottom: 16 }}>
                      {/* One-time / Installments */}
                      <Col xs={24} sm={12}>
                        <div
                          style={{ ...cardBase, ...(!isSubscription ? cardActive : {}) }}
                          onClick={() => form.setFieldsValue({ isSubscription: false })}
                          role="button"
                          aria-pressed={!isSubscription}
                        >
                          {!isSubscription && (
                            <CheckCircleOutlined style={{
                              position: "absolute", top: 10, right: 10,
                              color: "var(--ds-color-primary)", fontSize: 14,
                            }} />
                          )}
                          <WalletOutlined style={{
                            fontSize: 22,
                            color: !isSubscription ? "var(--ds-color-primary)" : "var(--ds-text-tertiary)",
                            display: "block", marginBottom: 8,
                            transition: "color 0.15s",
                          }} />
                          <Typography.Text strong style={{ fontSize: 13, display: "block", marginBottom: 3 }}>
                            {t("admin.contracts.form.typeOneTime")}
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.4, display: "block" }}>
                            {t("admin.contracts.form.typeOneTimeDesc")}
                          </Typography.Text>
                        </div>
                      </Col>

                      {/* Monthly Subscription */}
                      <Col xs={24} sm={12}>
                        <div
                          style={{ ...cardBase, ...(isSubscription ? cardActive : {}) }}
                          onClick={() => form.setFieldsValue({ isSubscription: true })}
                          role="button"
                          aria-pressed={isSubscription}
                        >
                          {isSubscription && (
                            <CheckCircleOutlined style={{
                              position: "absolute", top: 10, right: 10,
                              color: "var(--ds-color-primary)", fontSize: 14,
                            }} />
                          )}
                          <SyncOutlined style={{
                            fontSize: 22,
                            color: isSubscription ? "var(--ds-color-primary)" : "var(--ds-text-tertiary)",
                            display: "block", marginBottom: 8,
                            transition: "color 0.15s",
                          }} />
                          <Typography.Text strong style={{ fontSize: 13, display: "block", marginBottom: 3 }}>
                            {t("admin.contracts.form.typeSubscription")}
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.4, display: "block" }}>
                            {t("admin.contracts.form.typeSubscriptionDesc")}
                          </Typography.Text>
                        </div>
                      </Col>
                    </Row>

                    {/* ── One-time / Installments ───────────────────── */}
                    {!isSubscription && (
                      <div style={{
                        padding: "16px",
                        background: "var(--ds-surface-1)",
                        border: "1px solid var(--ds-border-subtle)",
                        borderRadius: 8,
                      }}>
                        {/* Quick equal-split tool */}
                        <Flex
                          align={isMobile ? "stretch" : "center"}
                          gap={8}
                          wrap="wrap"
                          vertical={isMobile}
                          style={{
                            padding: isMobile ? "12px" : "9px 12px",
                            background: "var(--ds-surface-0)",
                            border: "1px solid var(--ds-border-subtle)",
                            borderRadius: 6,
                            marginBottom: 14,
                          }}
                        >
                          <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: isMobile ? "normal" : "nowrap" }}>
                            {t("admin.contracts.form.equalSplitTitle")}
                          </Typography.Text>
                          <Flex gap={8} align="center" style={{ width: isMobile ? "100%" : "auto" }}>
                            <InputNumber
                              size="small"
                              min={0.01}
                              value={splitTotal ?? undefined}
                              onChange={(v) => setSplitTotal(typeof v === "number" ? v : null)}
                              placeholder={t("admin.contracts.form.equalSplitTotal")}
                              style={{ width: isMobile ? "100%" : 120, flex: isMobile ? 1 : undefined }}
                            />
                            <Typography.Text type="secondary">÷</Typography.Text>
                            <InputNumber
                              size="small"
                              min={2}
                              max={60}
                              precision={0}
                              value={splitParts}
                              onChange={(v) => setSplitParts(typeof v === "number" ? v : 2)}
                              style={{ width: 60 }}
                            />
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              {t("admin.contracts.form.equalSplitPartsLabel")}
                            </Typography.Text>
                          </Flex>
                          <Button size="small" type="primary" ghost onClick={applyEqualSplit} block={isMobile}>
                            {t("admin.contracts.form.equalSplitApply")}
                          </Button>
                        </Flex>

                        {/* Stage list */}
                        <Form.List name="stages">
                          {(fields, { add, remove }) => (
                            <Space direction="vertical" size={6} style={{ width: "100%" }}>
                              {fields.map(({ key, name, ...rest }, index) => (
                                <Flex
                                  key={key}
                                  gap={8}
                                  align="center"
                                  style={{
                                    padding: "8px 10px",
                                    background: "var(--ds-surface-0)",
                                    border: "1px solid var(--ds-border-subtle)",
                                    borderRadius: 6,
                                  }}
                                >
                                  <div style={{
                                    width: 20, height: 20, borderRadius: "50%",
                                    background: "var(--ds-color-primary-surface-deep)",
                                    color: "var(--ds-color-primary)",
                                    fontSize: 11, fontWeight: 600,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0,
                                  }}>
                                    {index + 1}
                                  </div>
                                  <Form.Item
                                    {...rest}
                                    name={[name, "description"]}
                                    rules={[{ required: true, message: t("admin.contracts.form.stageDescriptionRequired") }]}
                                    style={{ flex: 1, marginBottom: 0 }}
                                  >
                                    <Input placeholder={t("admin.contracts.form.stageDescription")} />
                                  </Form.Item>
                                  <Form.Item
                                    {...rest}
                                    name={[name, "amount"]}
                                    rules={[{ required: true, type: "number", min: 0.01, message: t("admin.contracts.form.stageAmountRequired") }]}
                                    style={{ width: 140, marginBottom: 0 }}
                                  >
                                    <InputNumber min={0.01} style={{ width: "100%" }} placeholder="0.00" />
                                  </Form.Item>
                                  <Tooltip title={t("common.remove")}>
                                    <Button
                                      type="text"
                                      danger
                                      icon={<MinusCircleOutlined />}
                                      onClick={() => remove(name)}
                                      disabled={fields.length === 1}
                                      style={{ flexShrink: 0 }}
                                    />
                                  </Tooltip>
                                </Flex>
                              ))}

                              <Button
                                type="dashed"
                                icon={<PlusOutlined />}
                                onClick={() => add({ description: "", amount: null })}
                                block
                                style={{ marginTop: 4 }}
                              >
                                {t("admin.contracts.form.addStage")}
                              </Button>
                            </Space>
                          )}
                        </Form.List>

                        {/* Live total */}
                        {(() => {
                          const stages: StageRow[] = getFieldValue("stages") ?? [];
                          const total = stages.reduce((sum, s) => sum + (s?.amount ?? 0), 0);
                          if (total <= 0) return null;
                          return (
                            <Flex
                              justify="space-between"
                              align="center"
                              style={{
                                marginTop: 10,
                                padding: "10px 14px",
                                background: "var(--ds-color-primary-surface)",
                                border: "1px solid var(--ds-color-primary-surface-deep)",
                                borderRadius: 6,
                              }}
                            >
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {t("admin.contracts.form.stagesTotal")} ({stages.filter(s => (s?.amount ?? 0) > 0).length} {t("admin.contracts.form.stagesCount")})
                              </Typography.Text>
                              <Typography.Text strong style={{ fontSize: 15, color: "var(--ds-color-primary)" }}>
                                {fmtMoney(total, currency)}
                              </Typography.Text>
                            </Flex>
                          );
                        })()}
                      </div>
                    )}

                    {/* ── Monthly Subscription ──────────────────────── */}
                    {isSubscription && (
                      <div style={{
                        padding: "16px",
                        background: "var(--ds-surface-1)",
                        border: "1px solid var(--ds-border-subtle)",
                        borderRadius: 8,
                      }}>
                        <Row gutter={12}>
                          <Col xs={24} sm={12}>
                            <Form.Item
                              name="monthlyAmount"
                              label={t("admin.contracts.form.monthlyAmount")}
                              rules={[{ required: true, type: "number", min: 0.01 }]}
                            >
                              <InputNumber
                                size="large"
                                min={0.01}
                                style={{ width: "100%" }}
                                placeholder="0.00"
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12}>
                            <Form.Item
                              name="subscriptionMonths"
                              label={t("admin.contracts.form.subscriptionMonths")}
                              extra={
                                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                                  {t("admin.contracts.form.subscriptionMonthsHint")}
                                </Typography.Text>
                              }
                            >
                              <InputNumber
                                size="large"
                                min={1}
                                max={60}
                                precision={0}
                                style={{ width: "100%" }}
                                placeholder={t("admin.contracts.form.subscriptionMonthsPlaceholder")}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12}>
                            <Form.Item
                              name="billingDay"
                              label={t("admin.contracts.form.billingDay")}
                              tooltip={t("admin.contracts.form.billingDayHint")}
                            >
                              <Select
                                size="large"
                                allowClear
                                placeholder={t("admin.contracts.form.billingDayPlaceholder")}
                                popupMatchSelectWidth={false}
                                options={Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        {/* Live subscription preview */}
                        {(() => {
                          const monthly = getFieldValue("monthlyAmount") as number | null;
                          const months = getFieldValue("subscriptionMonths") as number | null;
                          const day = getFieldValue("billingDay") as number | null;
                          if (!monthly || monthly <= 0) return null;
                          const hasMonths = months && months > 0;
                          const total = hasMonths ? monthly * months : null;
                          return (
                            <div style={{
                              padding: "10px 14px",
                              background: "var(--ds-color-primary-surface)",
                              border: "1px solid var(--ds-color-primary-surface-deep)",
                              borderRadius: 6,
                              marginTop: 4,
                            }}>
                              <Flex justify="space-between" align="center" gap={8} wrap="wrap">
                                <Flex align="center" gap={6}>
                                  <SyncOutlined style={{ color: "var(--ds-color-primary)", fontSize: 13 }} />
                                  <Typography.Text style={{ fontSize: 13, color: "var(--ds-text-secondary)" }}>
                                    {hasMonths
                                      ? `${fmtMoney(monthly, currency)} × ${months} ${t("admin.contracts.form.months")}`
                                      : `${fmtMoney(monthly, currency)} / ${t("admin.contracts.form.month")} · ${t("admin.contracts.form.openEnded")}`
                                    }
                                    {day ? ` · ${t("admin.contracts.form.billingDayPreview", { day })}` : ""}
                                  </Typography.Text>
                                </Flex>
                                {total !== null && (
                                  <Typography.Text strong style={{ fontSize: 15, color: "var(--ds-color-primary)" }}>
                                    = {fmtMoney(total, currency)}
                                  </Typography.Text>
                                )}
                              </Flex>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </>
                );
              }}
            </Form.Item>

            {/* Hidden form field — value managed via form.setFieldsValue */}
            <Form.Item name="isSubscription" valuePropName="checked" noStyle>
              <Switch style={{ display: "none" }} />
            </Form.Item>
          </div>
        </Form>
      </AppModal>

      {/* ── Detail modal ──────────────────────────────────────── */}
      <AppModal
        open={!!detailContract}
        onCancel={() => setDetailContract(null)}
        footer={null}
        title={detailContract?.title}
        width={isMobile ? "100%" : 640}
        styles={isMobile ? { body: { maxHeight: "70vh", overflowY: "auto" } } : undefined}
      >
        {detailContract && (() => {
          const [statusColor, statusKey] = statusCfg(detailContract.status);
          return (
            <Space direction="vertical" size={20} style={{ width: "100%" }}>
              {/* Metadata grid */}
              <Descriptions
                size="small"
                column={isMobile ? 1 : 2}
                style={{
                  background: "#f8fafc",
                  borderRadius: 8,
                  padding: "12px 16px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Descriptions.Item label={t("admin.contracts.columns.status")}>
                  <Tag color={statusColor}>{t(statusKey)}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={t("admin.contracts.columns.total")}>
                  <Typography.Text strong>
                    {fmtMoney(detailContract.totalAmount, detailContract.currency)}
                  </Typography.Text>
                </Descriptions.Item>
                {detailContract.signedAt && (
                  <Descriptions.Item label={t("admin.contracts.columns.signedAt")} span={2}>
                    <div>{new Date(detailContract.signedAt).toLocaleDateString()}</div>
                    {detailContract.signerName && (
                      <div style={{ color: "#64748b", fontSize: 12 }}>
                        {detailContract.signerName}
                        {detailContract.signerPosition
                          ? ` · ${detailContract.signerPosition}`
                          : ""}
                      </div>
                    )}
                    {detailContract.signedCopyEmail && (
                      <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
                        {t("admin.contracts.signedCopyEmail", {
                          email: detailContract.signedCopyEmail,
                        })}
                      </div>
                    )}
                  </Descriptions.Item>
                )}
              </Descriptions>

              {/* Contract body */}
              {detailContract.body && (
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: 8,
                    padding: "12px 16px",
                    fontSize: 13,
                    lineHeight: 1.8,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {renderContractBody(detailContract.body, {
                    signerName: detailContract.signerName,
                    signaturePngBase64: detailContract.signaturePngBase64,
                    signedAt: detailContract.signedAt,
                  })}
                </div>
              )}

              {/* PDF */}
              {detailContract.pdfBase64 && (
                <div>
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 12, display: "block", marginBottom: 6 }}
                  >
                    {t("admin.contracts.form.pdf")}
                  </Typography.Text>
                  <iframe
                    src={`data:application/pdf;base64,${detailContract.pdfBase64}`}
                    style={{
                      width: "100%",
                      height: 400,
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                    }}
                    title="contract-pdf"
                  />
                </div>
              )}

              {/* Payment stages */}
              <div>
                <Typography.Text strong style={{ display: "block", marginBottom: 10 }}>
                  {t("admin.contracts.form.stages")}
                </Typography.Text>
                <Space direction="vertical" size={0} style={{ width: "100%" }}>
                  {detailContract.stages.map((s) => {
                    const [sc, sk] = stageCfg(s.status);
                    return (
                      <Flex
                        key={s.id}
                        justify="space-between"
                        align="center"
                        style={{ padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}
                      >
                        <div>
                          <Space size={8}>
                            <Typography.Text>{s.description}</Typography.Text>
                            <Tag color={sc} style={{ fontSize: 11 }}>
                              {t(sk)}
                            </Tag>
                          </Space>
                          {s.paidAt && (
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                              {t("admin.contracts.stage.paidAt", {
                                date: new Date(s.paidAt).toLocaleString(),
                              })}
                            </div>
                          )}
                        </div>
                        <Typography.Text strong>
                          {fmtMoney(s.amount, detailContract.currency)}
                        </Typography.Text>
                      </Flex>
                    );
                  })}
                </Space>
              </div>

              {/* Subscription payment history */}
              {detailSubStatus && detailSubStatus.payments.length > 0 && (
                <SubscriptionPaymentHistory payments={detailSubStatus.payments} t={t} />
              )}

              {/* Signature image */}
              {detailContract.status === "signed" && detailContract.signaturePngBase64 && (
                <div>
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 12, display: "block", marginBottom: 8 }}
                  >
                    <CheckCircleOutlined style={{ color: "#22c55e", marginInlineEnd: 4 }} />
                    {t("admin.contracts.signedBy", {
                      name: detailContract.signerName,
                      date: detailContract.signedAt
                        ? new Date(detailContract.signedAt).toLocaleString()
                        : "",
                    })}
                  </Typography.Text>
                  <Image
                    src={`data:image/png;base64,${detailContract.signaturePngBase64}`}
                    style={{ border: "1px solid #e2e8f0", borderRadius: 8, maxWidth: 280 }}
                    alt="signature"
                  />
                </div>
              )}

              {/* Sign link */}
              {(detailContract.status === "pending_signature" ||
                detailContract.status === "draft") && (
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: 8,
                    padding: "12px 16px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 12, display: "block", marginBottom: 8 }}
                  >
                    {t("admin.contracts.signLink")}
                  </Typography.Text>
                  <Row gutter={8}>
                    <Col xs={24} sm="auto" flex={isMobile ? undefined : "auto"}>
                      <Input readOnly value={signUrl(detailContract)} size="small" />
                    </Col>
                    <Col xs={24} sm="auto">
                      <Button
                        size="small"
                        block={isMobile}
                        icon={
                          copiedId === detailContract.id ? (
                            <CheckCircleOutlined style={{ color: "#22c55e" }} />
                          ) : (
                            <CopyOutlined />
                          )
                        }
                        onClick={() => void copyLink(detailContract)}
                      >
                        {copiedId === detailContract.id
                          ? t("admin.contracts.linkCopied")
                          : t("admin.contracts.copyLink")}
                      </Button>
                    </Col>
                  </Row>
                </div>
              )}

              {/* Payment link */}
              {detailContract.status === "signed" && (
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: 8,
                    padding: "12px 16px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Typography.Text
                    type="secondary"
                    style={{ fontSize: 12, display: "block", marginBottom: 8 }}
                  >
                    {t("admin.contracts.paymentLink")}
                  </Typography.Text>
                  <Row gutter={8}>
                    <Col xs={24} sm="auto" flex={isMobile ? undefined : "auto"}>
                      <Input readOnly value={paymentUrl(detailContract)} size="small" />
                    </Col>
                    <Col xs={24} sm="auto">
                      <Button
                        size="small"
                        block={isMobile}
                        icon={
                          copiedId === detailContract.id ? (
                            <CheckCircleOutlined style={{ color: "#22c55e" }} />
                          ) : (
                            <CreditCardOutlined />
                          )
                        }
                        onClick={() => void copyPaymentLink(detailContract)}
                      >
                        {copiedId === detailContract.id
                          ? t("admin.contracts.linkCopied")
                          : t("admin.contracts.copyPaymentLink")}
                      </Button>
                    </Col>
                  </Row>
                </div>
              )}
            </Space>
          );
        })()}
      </AppModal>

      <SubscriptionStatusModal
        contractId={subscriptionContractId}
        onClose={() => setSubscriptionContractId(null)}
      />
    </PageContainer>
  );
}
