import {
  CheckCircleOutlined,
  CopyOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilePdfOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  SendOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Col,
  Divider,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Contract } from "../../../../../domain/Contract";
import { useApp } from "../../../../../app/AppProviders";
import { renderContractBody } from "../../../contracts/contractBodyRenderer";

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

function statusTag(status: Contract["status"]) {
  const map: Record<string, [string, string]> = {
    draft: ["default", "admin.contracts.status.draft"],
    pending_signature: ["processing", "admin.contracts.status.pending_signature"],
    signed: ["success", "admin.contracts.status.signed"],
    voided: ["error", "admin.contracts.status.voided"],
  };
  return map[status] ?? ["default", status];
}

function getPaidStagesCount(contract: Contract) {
  return contract.stages.filter((stage) => stage.status === "paid").length;
}

function getPaidAmount(contract: Contract) {
  return contract.stages
    .filter((stage) => stage.status === "paid")
    .reduce((sum, stage) => sum + (stage.amount ?? 0), 0);
}

function installmentsTagKey(contract: Contract): [string, string] {
  const paidStages = getPaidStagesCount(contract);
  const totalStages = contract.stages.length;
  if (!totalStages) {
    return ["default", "admin.contracts.installmentsTag.unpaid"];
  }
  if (paidStages === totalStages) {
    return ["success", "admin.contracts.installmentsTag.paid"];
  }
  if (paidStages === 0) {
    return ["default", "admin.contracts.installmentsTag.unpaid"];
  }
  return ["warning", "admin.contracts.installmentsTag.partial"];
}

function stageStatusTag(status: Contract["stages"][number]["status"]) {
  const map: Record<string, [string, string]> = {
    pending: ["default", "admin.contracts.stageStatus.pending"],
    invoiced: ["processing", "admin.contracts.stageStatus.invoiced"],
    paid: ["success", "admin.contracts.stageStatus.paid"],
  };
  return map[status] ?? ["default", status];
}

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
}

/** Split total (major currency units) into `count` parts; cents remainder spread across first rows. */
function splitEqualPaymentAmounts(totalMajor: number, count: number): number[] {
  if (count < 1 || totalMajor <= 0) return [];
  const cents = Math.round(totalMajor * 100);
  const base = Math.floor(cents / count);
  let rem = cents - base * count;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const add = rem > 0 ? 1 : 0;
    if (rem > 0) rem -= 1;
    out.push((base + add) / 100);
  }
  return out;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AdminContractsPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const { services, users } = useApp();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detailContract, setDetailContract] = useState<Contract | null>(null);
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

  const signUrl = (c: Contract) =>
    `${window.location.origin}/contracts/sign/${c.signToken}`;

  const paymentUrl = (c: Contract) =>
    `${window.location.origin}/contracts/sign/${c.signToken}`;

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
    const amounts = splitEqualPaymentAmounts(splitTotal, splitParts);
    const stages = amounts.map((amount, i) => ({
      description: t("admin.contracts.form.equalStageLabel", { current: i + 1, total: splitParts }),
      amount,
    }));
    form.setFieldsValue({ stages });
    void message.success(t("admin.contracts.form.equalSplitApplied"));
  };

  const handleCreate = async (values: FormValues) => {
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

  const columns: ColumnsType<Contract> = [
    {
      title: t("admin.contracts.columns.contractId"),
      dataIndex: "id",
      key: "id",
      width: 88,
      render: (id: number) => <Typography.Text type="secondary">#{id}</Typography.Text>,
    },
    {
      title: t("admin.contracts.columns.account"),
      dataIndex: "accountId",
      key: "account",
      render: (id: number) => {
        const u = users.find((x) => x.accountId === id);
        return u?.displayName ? `#${id} · ${u.displayName}` : `#${id}`;
      },
    },
    {
      title: t("admin.contracts.columns.title"),
      dataIndex: "title",
      key: "title",
    },
    {
      title: t("admin.contracts.columns.total"),
      key: "total",
      render: (_, r) => fmtMoney(r.totalAmount, r.currency),
    },
    {
      title: t("admin.contracts.columns.stages"),
      key: "stages",
      render: (_, r) => r.stages.length,
    },
    {
      title: t("admin.contracts.columns.installments"),
      key: "installments",
      width: 210,
      render: (_, r) => {
        const [color, key] = installmentsTagKey(r);
        const paidAmount = getPaidAmount(r);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <Tag color={color}>
              {t(key, { paid: getPaidStagesCount(r), total: r.stages.length })}
            </Tag>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {fmtMoney(paidAmount, r.currency)} / {fmtMoney(r.totalAmount, r.currency)}
            </Typography.Text>
          </div>
        );
      },
    },
    {
      title: t("admin.contracts.columns.status"),
      key: "status",
      render: (_, r) => {
        const [color, key] = statusTag(r.status);
        return <Tag color={color}>{t(key)}</Tag>;
      },
    },
    {
      title: t("admin.contracts.columns.signedAt"),
      key: "signedAt",
      render: (_, r) =>
        r.signedAt ? new Date(r.signedAt).toLocaleDateString() : "-",
    },
    {
      title: "",
      key: "actions",
      width: 185,
      render: (_, r) => (
        <Space size={4}>
          <Tooltip title={t("admin.contracts.viewDetail")}>
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => setDetailContract(r)}
            />
          </Tooltip>
          {(r.status === "draft" || r.status === "pending_signature") && (
            <Tooltip
              title={copiedId === r.id ? t("admin.contracts.linkCopied") : t("admin.contracts.copyLink")}
            >
              <Button
                type="text"
                size="small"
                icon={copiedId === r.id ? <CheckCircleOutlined style={{ color: "#22c55e" }} /> : <CopyOutlined />}
                onClick={() => void copyLink(r)}
              />
            </Tooltip>
          )}
          {r.status === "signed" && (
            <Tooltip
              title={copiedId === r.id ? t("admin.contracts.linkCopied") : t("admin.contracts.copyPaymentLink")}
            >
              <Button
                type="text"
                size="small"
                icon={copiedId === r.id ? <CheckCircleOutlined style={{ color: "#22c55e" }} /> : <CreditCardOutlined />}
                onClick={() => void copyPaymentLink(r)}
              />
            </Tooltip>
          )}
          {r.status === "draft" && (
            <Tooltip title={t("admin.contracts.send")}>
              <Button
                type="text"
                size="small"
                icon={<SendOutlined />}
                onClick={() => void handleSend(r)}
              />
            </Tooltip>
          )}
          {r.status !== "voided" && r.status !== "signed" && (
            <Tooltip title={t("admin.contracts.void")}>
              <Button
                type="text"
                size="small"
                danger
                icon={<MinusCircleOutlined />}
                onClick={() => handleVoid(r)}
              />
            </Tooltip>
          )}
          <Tooltip title={t("admin.contracts.delete")}>
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(r)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {t("admin.contracts.title")}
          </Typography.Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
          >
            {t("admin.contracts.create")}
          </Button>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={contracts}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
      />

      {/* ── Create drawer ─────────────────────────────────────────── */}
      <Drawer
        title={t("admin.contracts.create")}
        open={createOpen}
        onClose={resetCreateForm}
        width={560}
        footer={
          <Row justify="end" gutter={8}>
            <Col><Button onClick={resetCreateForm}>{t("common.cancel")}</Button></Col>
            <Col>
              <Button type="primary" loading={creating} onClick={() => void form.validateFields().then(handleCreate)}>
                {t("admin.contracts.create")}
              </Button>
            </Col>
          </Row>
        }
      >
        <Form form={form} layout="vertical" initialValues={{ currency: "ILS", stages: [{ description: "", amount: null }] }}>
          <Form.Item
            name="accountId"
            label={t("admin.contracts.form.account")}
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              placeholder={t("admin.contracts.form.accountPlaceholder")}
              filterOption={(input, opt) =>
                (opt?.label as string ?? "").toLowerCase().includes(input.toLowerCase())
              }
              options={users
                .filter(
                  (u) =>
                    u.role !== "admin" &&
                    u.accountId != null &&
                    u.accountId > 0,
                )
                .map((u) => ({
                  value: u.accountId as number,
                  label: u.displayName || u.email,
                }))}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col flex="auto">
              <Form.Item name="title" label={t("admin.contracts.form.title")} rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col>
              <Form.Item name="currency" label={t("admin.contracts.form.currency")}>
                <Select style={{ width: 90 }} options={[{ value: "ILS" }, { value: "USD" }, { value: "EUR" }]} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="body"
            label={t("admin.contracts.form.body")}
            extra={
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t("admin.contracts.form.bodyFormatHint")}
              </Typography.Text>
            }
          >
            <Input.TextArea rows={12} placeholder={t("admin.contracts.form.bodyPlaceholder")} style={{ fontFamily: "inherit" }} />
          </Form.Item>

          <Form.Item label={t("admin.contracts.form.pdf")}>
            <Upload
              accept=".pdf"
              maxCount={1}
              showUploadList={false}
              beforeUpload={(file) => {
                readFileAsBase64(file).then((b64) => {
                  setPdfBase64(b64);
                  setPdfFileName(file.name);
                }).catch(() => void message.error(t("errors.generic")));
                return false;
              }}
              onRemove={() => { setPdfBase64(null); setPdfFileName(null); }}
            >
              <Button icon={<FilePdfOutlined />}>
                {pdfFileName ?? t("admin.contracts.form.pdfUpload")}
              </Button>
            </Upload>
            {pdfFileName && (
              <Button
                type="link"
                danger
                size="small"
                style={{ paddingInlineStart: 0 }}
                onClick={() => { setPdfBase64(null); setPdfFileName(null); }}
              >
                {t("admin.contracts.form.pdfRemove")}
              </Button>
            )}
          </Form.Item>

          <Divider style={{ margin: "12px 0" }}>{t("admin.contracts.form.stages")}</Divider>

          <div
            style={{
              marginBottom: 16,
              padding: "12px 14px",
              background: "#f8fafc",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
          >
            <Typography.Text strong style={{ display: "block", marginBottom: 10 }}>
              {t("admin.contracts.form.equalSplitTitle")}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 10 }}>
              {t("admin.contracts.form.equalSplitHint")}
            </Typography.Text>
            <Row gutter={8} align="middle">
              <Col>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t("admin.contracts.form.equalSplitTotal")}
                </Typography.Text>
                <InputNumber
                  min={0.01}
                  value={splitTotal ?? undefined}
                  onChange={(v) => setSplitTotal(typeof v === "number" ? v : null)}
                  style={{ width: "100%", minWidth: 120, display: "block", marginTop: 4 }}
                  placeholder="0.00"
                />
              </Col>
              <Col>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t("admin.contracts.form.equalSplitParts")}
                </Typography.Text>
                <InputNumber
                  min={2}
                  max={60}
                  precision={0}
                  value={splitParts}
                  onChange={(v) => setSplitParts(typeof v === "number" ? v : 2)}
                  style={{ width: "100%", minWidth: 72, display: "block", marginTop: 4 }}
                />
              </Col>
              <Col style={{ alignSelf: "flex-end", paddingBottom: 2 }}>
                <Button type="default" onClick={applyEqualSplit}>
                  {t("admin.contracts.form.equalSplitApply")}
                </Button>
              </Col>
            </Row>
          </div>

          <Form.List name="stages">
            {(fields, { add, remove }) => (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {fields.map(({ key, name, ...rest }, index) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "10px 12px 2px",
                    }}
                  >
                    {/* Stage number badge */}
                    <div
                      style={{
                        flexShrink: 0,
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: "#3b82f6",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        marginTop: 5,
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Description */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Form.Item
                        {...rest}
                        name={[name, "description"]}
                        rules={[{ required: true, message: "" }]}
                        style={{ marginBottom: 8 }}
                      >
                        <Input placeholder={t("admin.contracts.form.stageDescription")} />
                      </Form.Item>
                    </div>

                    {/* Amount */}
                    <div style={{ flexShrink: 0 }}>
                      <Form.Item
                        {...rest}
                        name={[name, "amount"]}
                        rules={[{ required: true, type: "number", min: 0.01, message: "" }]}
                        style={{ marginBottom: 8 }}
                      >
                        <InputNumber min={0.01} style={{ width: 110 }} placeholder="0.00" />
                      </Form.Item>
                    </div>

                    {/* Remove */}
                    <div style={{ flexShrink: 0, marginTop: 5 }}>
                      <Button
                        type="text"
                        danger
                        icon={<MinusCircleOutlined />}
                        onClick={() => remove(name)}
                        disabled={fields.length === 1}
                        style={{ opacity: fields.length === 1 ? 0 : 1 }}
                      />
                    </div>
                  </div>
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
              </div>
            )}
          </Form.List>
        </Form>
      </Drawer>

      {/* ── Detail modal ──────────────────────────────────────────── */}
      <Modal
        open={!!detailContract}
        onCancel={() => setDetailContract(null)}
        footer={null}
        title={detailContract?.title}
        width={640}
      >
        {detailContract && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Typography.Text type="secondary">{t("admin.contracts.columns.status")}</Typography.Text>
                <br />
                {(() => { const [color, key] = statusTag(detailContract.status); return <Tag color={color}>{t(key)}</Tag>; })()}
              </Col>
              <Col span={12}>
                <Typography.Text type="secondary">{t("admin.contracts.columns.total")}</Typography.Text>
                <br />
                <Typography.Text strong>{fmtMoney(detailContract.totalAmount, detailContract.currency)}</Typography.Text>
              </Col>
            </Row>

            {detailContract.body && (
              <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13, lineHeight: 1.8 }}>
                {renderContractBody(detailContract.body, {
                  signerName: detailContract.signerName,
                  signaturePngBase64: detailContract.signaturePngBase64,
                  signedAt: detailContract.signedAt,
                })}
              </div>
            )}

            {detailContract.pdfBase64 && (
              <div style={{ marginBottom: 16 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                  {t("admin.contracts.form.pdf")}
                </Typography.Text>
                <iframe
                  src={`data:application/pdf;base64,${detailContract.pdfBase64}`}
                  style={{ width: "100%", height: 420, border: "1px solid #e2e8f0", borderRadius: 8 }}
                  title="contract-pdf"
                />
              </div>
            )}

            <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
              {t("admin.contracts.form.stages")}
            </Typography.Text>
            {detailContract.stages.map((s, i) => {
              const [tagColor, tagKey] = stageStatusTag(s.status);
              return (
                <Row
                  key={s.id}
                  justify="space-between"
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: i % 2 === 0 ? "#f8fafc" : "#fff",
                    marginBottom: 4,
                  }}
                >
                  <Space size={6}>
                    <Typography.Text>{s.description}</Typography.Text>
                    <Tag color={tagColor}>{t(tagKey)}</Tag>
                  </Space>
                  <Typography.Text strong>{fmtMoney(s.amount, detailContract.currency)}</Typography.Text>
                </Row>
              );
            })}

            {(detailContract.status === "pending_signature" || detailContract.status === "draft") && (
              <div style={{ marginTop: 16 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                  {t("admin.contracts.signLink")}
                </Typography.Text>
                <Row gutter={8}>
                  <Col flex="auto">
                    <Input readOnly value={signUrl(detailContract)} size="small" />
                  </Col>
                  <Col>
                    <Button
                      size="small"
                      icon={copiedId === detailContract.id ? <CheckCircleOutlined style={{ color: "#22c55e" }} /> : <CopyOutlined />}
                      onClick={() => void copyLink(detailContract)}
                    >
                      {copiedId === detailContract.id ? t("admin.contracts.linkCopied") : t("admin.contracts.copyLink")}
                    </Button>
                  </Col>
                </Row>
              </div>
            )}

            {detailContract.status === "signed" && (
              <div style={{ marginTop: 16 }}>
                <Divider />
                <Typography.Text strong style={{ display: "block", marginBottom: 8 }}>
                  <CheckCircleOutlined style={{ color: "#22c55e", marginInlineEnd: 6 }} />
                  {t("admin.contracts.signedBy", { name: detailContract.signerName, date: detailContract.signedAt ? new Date(detailContract.signedAt).toLocaleString() : "" })}
                </Typography.Text>
                {detailContract.signerPosition ? (
                  <Typography.Text type="secondary" style={{ display: "block", marginBottom: 6 }}>
                    {t("admin.contracts.signedPosition", { position: detailContract.signerPosition })}
                  </Typography.Text>
                ) : null}
                {detailContract.signedCopyEmail ? (
                  <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                    {t("admin.contracts.signedCopyEmail", { email: detailContract.signedCopyEmail })}
                  </Typography.Text>
                ) : null}
                {detailContract.signaturePngBase64 && (
                  <Image
                    src={`data:image/png;base64,${detailContract.signaturePngBase64}`}
                    style={{ border: "1px solid #e2e8f0", borderRadius: 8, maxWidth: 320 }}
                    alt="signature"
                  />
                )}
                <div style={{ marginTop: 12 }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                    {t("admin.contracts.paymentLink")}
                  </Typography.Text>
                  <Row gutter={8}>
                    <Col flex="auto">
                      <Input readOnly value={paymentUrl(detailContract)} size="small" />
                    </Col>
                    <Col>
                      <Button
                        size="small"
                        icon={copiedId === detailContract.id ? <CheckCircleOutlined style={{ color: "#22c55e" }} /> : <CreditCardOutlined />}
                        onClick={() => void copyPaymentLink(detailContract)}
                      >
                        {copiedId === detailContract.id ? t("admin.contracts.linkCopied") : t("admin.contracts.copyPaymentLink")}
                      </Button>
                    </Col>
                  </Row>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
