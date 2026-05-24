import {
  CheckCircleOutlined,
  ContainerOutlined,
  CopyOutlined,
  CreditCardOutlined,
  FilePdfOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Col,
  Descriptions,
  Flex,
  Form,
  Grid,
  Image,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
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
import { PageHeader } from "../../../shared/components/PageHeader";
import { SubscriptionStatusModal } from "./SubscriptionStatusModal";
import { ContractRowActions } from "./ContractRowActions";
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

  const signUrl = (c: Contract) => `${window.location.origin}/contracts/sign/${c.signToken}`;
  const paymentUrl = (c: Contract) => `${window.location.origin}/contracts/sign/${c.signToken}`;

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
    const amounts = splitEqual(splitTotal, splitParts);
    form.setFieldsValue({
      stages: amounts.map((amount, i) => ({
        description: t("admin.contracts.form.equalStageLabel", { current: i + 1, total: splitParts }),
        amount,
      })),
    });
    void message.success(t("admin.contracts.form.equalSplitApplied"));
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
        {t("admin.contracts.create")}
      </Button>
    </Flex>
  );

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <PageHeader title={t("admin.contracts.title")} />

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
              const paidAmt = getPaidAmount(c);

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
          />
        )}
      </ListCard>

      {/* ── Create modal ──────────────────────────────────────── */}
      <AppModal
        title={t("admin.contracts.create")}
        open={createOpen}
        onCancel={resetCreateForm}
        width={720}
        footer={createFooter}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ currency: "ILS", stages: [{ description: "", amount: null }], isSubscription: false }}
        >
          {/* Client Selection */}
          <div style={{ marginBottom: 24 }}>
            <Typography.Title level={5} style={{ marginBottom: 12 }}>
              {t("admin.contracts.form.selectClient")}
            </Typography.Title>
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
                    <div style={{ fontSize: 12, color: "#888" }}>{opt.data.email}</div>
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

          {/* Contract Details */}
          <div
            style={{
              padding: "16px",
              background: "#fafafa",
              borderRadius: 8,
              marginBottom: 24,
            }}
          >
            <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
              {t("admin.contracts.form.contractDetails")}
            </Typography.Title>

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
              <Upload
                accept=".pdf"
                maxCount={1}
                showUploadList={false}
                beforeUpload={(file) => {
                  readFileAsBase64(file)
                    .then((b64) => {
                      setPdfBase64(b64);
                      setPdfFileName(file.name);
                      form.setFieldsValue({ body: "" }); // Clear body when PDF is uploaded
                    })
                    .catch(() => void message.error(t("errors.generic")));
                  return false;
                }}
              >
                <Button icon={<FilePdfOutlined />}>
                  {pdfFileName ?? t("admin.contracts.form.pdfUpload")}
                </Button>
              </Upload>
              {pdfFileName && (
                <>
                  <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                    {pdfFileName}
                  </Typography.Text>
                  <Button
                    type="link"
                    danger
                    size="small"
                    style={{ paddingInlineStart: 8 }}
                    onClick={() => {
                      setPdfBase64(null);
                      setPdfFileName(null);
                    }}
                  >
                    {t("admin.contracts.form.pdfRemove")}
                  </Button>
                </>
              )}
            </Form.Item>
          </div>

          {/* Payment Type Toggle */}
          <div
            style={{
              padding: "14px 16px",
              background: "#f0f9ff",
              borderRadius: 8,
              border: "1px solid #bae6fd",
              marginBottom: 16,
            }}
          >
            <Flex gap={12} align="center">
              <Form.Item name="isSubscription" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
              <div style={{ flex: 1 }}>
                <Typography.Text strong>
                  {t("admin.contracts.form.subscriptionToggle")}
                </Typography.Text>
              </div>
            </Flex>
          </div>

          {/* Payment Configuration */}
          <Form.Item noStyle shouldUpdate={(prev, curr) => prev.isSubscription !== curr.isSubscription}>
            {({ getFieldValue }) => {
              const isSubscription = getFieldValue("isSubscription");

              if (isSubscription) {
                // Subscription mode
                return (
                  <div
                    style={{
                      padding: "16px",
                      background: "#fafafa",
                      borderRadius: 8,
                    }}
                  >
                    <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
                      {t("admin.contracts.form.subscriptionSettings")}
                    </Typography.Title>
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
                            placeholder="12"
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                );
              }

              // One-time payment mode
              return (
                <div
                  style={{
                    padding: "16px",
                    background: "#fafafa",
                    borderRadius: 8,
                  }}
                >
                  <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
                    {t("admin.contracts.form.paymentStages")}
                  </Typography.Title>

                  {/* Equal split helper */}
                  <Flex
                    gap={8}
                    align="center"
                    wrap="wrap"
                    style={{
                      padding: "10px 14px",
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      marginBottom: 16,
                    }}
                  >
                    <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {t("admin.contracts.form.equalSplitTitle")}:
                    </Typography.Text>
                    <InputNumber
                      size="small"
                      min={0.01}
                      value={splitTotal ?? undefined}
                      onChange={(v) => setSplitTotal(typeof v === "number" ? v : null)}
                      placeholder={t("admin.contracts.form.equalSplitTotal")}
                      style={{ width: 120 }}
                    />
                    <Typography.Text type="secondary">÷</Typography.Text>
                    <InputNumber
                      size="small"
                      min={2}
                      max={60}
                      precision={0}
                      value={splitParts}
                      onChange={(v) => setSplitParts(typeof v === "number" ? v : 2)}
                      style={{ width: 64 }}
                    />
                    <Button size="small" type="primary" ghost onClick={applyEqualSplit}>
                      {t("admin.contracts.form.equalSplitApply")}
                    </Button>
                  </Flex>

                  {/* Stage list */}
                  <Form.List name="stages">
                    {(fields, { add, remove }) => (
                      <Space direction="vertical" size={0} style={{ width: "100%" }}>
                        {fields.map(({ key, name, ...rest }, index) => (
                          <Flex
                            key={key}
                            gap={8}
                            align="center"
                            style={{ padding: "8px 0", borderBottom: "1px solid #e0e0e0" }}
                          >
                            <Typography.Text
                              type="secondary"
                              style={{ flex: "0 0 22px", textAlign: "center", fontSize: 13 }}
                            >
                              {index + 1}
                            </Typography.Text>
                            <Form.Item
                              {...rest}
                              name={[name, "description"]}
                              rules={[{ required: true, message: "" }]}
                              style={{ flex: 1, marginBottom: 0 }}
                            >
                              <Input placeholder={t("admin.contracts.form.stageDescription")} />
                            </Form.Item>
                            <Form.Item
                              {...rest}
                              name={[name, "amount"]}
                              rules={[{ required: true, type: "number", min: 0.01, message: "" }]}
                              style={{ width: 130, marginBottom: 0 }}
                            >
                              <InputNumber min={0.01} style={{ width: "100%" }} placeholder="0.00" />
                            </Form.Item>
                            <Button
                              type="text"
                              danger
                              icon={<MinusCircleOutlined />}
                              onClick={() => remove(name)}
                              disabled={fields.length === 1}
                            />
                          </Flex>
                        ))}

                        <Button
                          type="dashed"
                          icon={<PlusOutlined />}
                          onClick={() => add({ description: "", amount: null })}
                          block
                          style={{ marginTop: 12 }}
                        >
                          {t("admin.contracts.form.addStage")}
                        </Button>
                      </Space>
                    )}
                  </Form.List>
                </div>
              );
            }}
          </Form.Item>
        </Form>
      </AppModal>

      {/* ── Detail modal ──────────────────────────────────────── */}
      <AppModal
        open={!!detailContract}
        onCancel={() => setDetailContract(null)}
        footer={null}
        title={detailContract?.title}
        width={640}
      >
        {detailContract && (() => {
          const [statusColor, statusKey] = statusCfg(detailContract.status);
          return (
            <Space direction="vertical" size={20} style={{ width: "100%" }}>
              {/* Metadata grid */}
              <Descriptions
                size="small"
                column={2}
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
                        <Space size={8}>
                          <Typography.Text>{s.description}</Typography.Text>
                          <Tag color={sc} style={{ fontSize: 11 }}>
                            {t(sk)}
                          </Tag>
                        </Space>
                        <Typography.Text strong>
                          {fmtMoney(s.amount, detailContract.currency)}
                        </Typography.Text>
                      </Flex>
                    );
                  })}
                </Space>
              </div>

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
                    <Col flex="auto">
                      <Input readOnly value={signUrl(detailContract)} size="small" />
                    </Col>
                    <Col>
                      <Button
                        size="small"
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
                    <Col flex="auto">
                      <Input readOnly value={paymentUrl(detailContract)} size="small" />
                    </Col>
                    <Col>
                      <Button
                        size="small"
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
