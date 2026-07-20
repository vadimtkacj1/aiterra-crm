import {
  CalendarOutlined,
  ClockCircleOutlined,
  FileAddOutlined,
  FileTextOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Button,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  Tooltip,
  Typography,
} from "antd";
import type { FormInstance } from "antd/es/form";
import type { GlobalToken } from "antd/es/theme/interface";
import type { TFunction } from "i18next";
import { SectionStep, formatMoney } from "./billingUi";
import type { AdminPaymentsFormValues, BillingSchedule } from "./types";
import { BILLING_CURRENCIES } from "./types";

type Props = {
  t: TFunction;
  token: GlobalToken;
  shellRadius: number;
  shellShadow: string;
  form: FormInstance<AdminPaymentsFormValues>;
  chargeTypeW: "none" | "one_time" | "monthly" | undefined;
  useBreakdownW: boolean | undefined;
  currencyW: string;
  linesRunningTotal: number | null;
  canSaveTemplate: boolean;
  openSaveTemplateModal: () => void;
  presetBundle: () => void;
  presetServerOnly: () => void;
};

type ChargeTypePickerProps = {
  value?: string;
  onChange?: (v: string) => void;
  token: GlobalToken;
  t: TFunction;
};

function ChargeTypePicker({ value, onChange, token, t }: ChargeTypePickerProps) {
  const options = [
    {
      value: "one_time",
      icon: <FileTextOutlined style={{ fontSize: 24 }} />,
      label: t("admin.payments.chargeOneShort"),
      desc: t("admin.payments.chargeOneDesc"),
      color: "#1890ff",
    },
    {
      value: "monthly",
      icon: <CalendarOutlined style={{ fontSize: 24 }} />,
      label: t("admin.payments.chargeMonthlyShort"),
      desc: t("admin.payments.chargeMonthlyDesc"),
      color: "#16a34a", // used in `${color}10` alpha concat below — must stay a literal hex
    },
  ];

  return (
    <Radio.Group value={value} onChange={(e) => onChange?.(e.target.value)} style={{ width: "100%" }}>
      <Row gutter={16}>
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <Col xs={24} sm={12} key={opt.value}>
              <Radio.Button
                value={opt.value}
                style={{
                  width: "100%",
                  height: "auto",
                  padding: 0,
                  border: "none",
                  marginBottom: 0,
                }}
              >
                <div
                  style={{
                    padding: "20px",
                    borderRadius: 8,
                    border: `2px solid ${selected ? opt.color : token.colorBorder}`,
                    background: selected ? `${opt.color}10` : token.colorBgContainer,
                    transition: "all 0.2s",
                    cursor: "pointer",
                    height: "100%",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      background: selected ? opt.color : token.colorFillSecondary,
                      color: selected ? "#fff" : token.colorTextSecondary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    {opt.icon}
                  </div>
                  <Typography.Title level={5} style={{ margin: 0, marginBottom: 6 }}>
                    {opt.label}
                  </Typography.Title>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {opt.desc}
                  </Typography.Text>
                </div>
              </Radio.Button>
            </Col>
          );
        })}
      </Row>
    </Radio.Group>
  );
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function InvoiceComposerCard({
  t,
  token,
  shellRadius,
  shellShadow,
  form,
  chargeTypeW,
  useBreakdownW,
  currencyW,
  linesRunningTotal,
  canSaveTemplate,
  openSaveTemplateModal,
  presetBundle,
  presetServerOnly,
}: Props) {
  const splitM = Form.useWatch("splitAcrossMonths", form);
  const scheduleW = Form.useWatch("billingSchedule", form) as BillingSchedule | undefined;
  const amtW = Form.useWatch("amount", form);
  const splitN = typeof splitM === "number" && splitM >= 2 ? Math.min(60, Math.floor(splitM)) : 0;
  const perPreview =
    chargeTypeW === "monthly" && splitN >= 2 && typeof amtW === "number" && amtW > 0
      ? Math.round((amtW / splitN) * 100) / 100
      : null;

  const sectionStyle = {
    marginTop: 20,
    paddingTop: 20,
    borderTop: "1px solid var(--ds-border-subtle)",
  };

  return (
    <div
      style={{
        borderRadius: shellRadius,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: shellShadow,
        background: token.colorBgContainer,
        padding: "20px 20px 24px",
      }}
    >
      {/* Header */}
      <Flex justify="space-between" align="flex-start" gap={12} wrap="wrap" style={{ marginBottom: 16 }}>
        <div style={{ flex: "1 1 240px", minWidth: 0 }}>
          <SectionStep
            title={t("admin.payments.stepInvoiceTitle")}
            hint={t("admin.payments.stepInvoiceHint")}
          />
        </div>
        <Tooltip title={canSaveTemplate ? undefined : t("admin.payments.templateNeedCharge")}>
          <Button
            type="default"
            icon={<FileAddOutlined />}
            onClick={openSaveTemplateModal}
            disabled={!canSaveTemplate}
            style={{ borderRadius: 8, flexShrink: 0 }}
          >
            {t("admin.payments.saveAsTemplate")}
          </Button>
        </Tooltip>
      </Flex>

      {/* Charge type selection */}
      <Form.Item name="chargeType" style={{ marginBottom: 20 }}>
        <ChargeTypePicker token={token} t={t} />
      </Form.Item>

      <Divider style={{ margin: "20px 0 16px" }} />

      {/* Pricing mode toggle */}
      <Flex align="center" justify="space-between" wrap="wrap" gap={8} style={{ marginBottom: 16 }}>
        <Typography.Text strong style={{ fontSize: 13 }}>
          {t("admin.payments.sectionAmounts")}
        </Typography.Text>
        <Form.Item name="useBreakdown" noStyle>
          <Radio.Group
            size="small"
            optionType="button"
            disabled={chargeTypeW === "monthly" && splitN >= 2}
          >
            <Radio.Button value={false}>{t("admin.payments.itemizedOff")}</Radio.Button>
            <Radio.Button value={true}>{t("admin.payments.itemizedOn")}</Radio.Button>
          </Radio.Group>
        </Form.Item>
      </Flex>

          {/* Single total */}
          {!useBreakdownW ? (
            <Row gutter={[12, 0]} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={14} md={12}>
                <Form.Item
                  name="amount"
                  label={
                    chargeTypeW === "monthly" && splitN >= 2
                      ? t("admin.payments.splitContractTotalLabel")
                      : chargeTypeW === "monthly"
                        ? t("admin.payments.monthlyRecurringAmountLabel")
                        : t("admin.form.billingAmount")
                  }
                  extra={
                    perPreview != null
                      ? t("admin.payments.splitPreviewHelp", {
                          perMonth: formatMoney(perPreview, currencyW),
                          months: splitN,
                          total: formatMoney(amtW as number, currencyW),
                        })
                      : undefined
                  }
                  rules={[{ required: true, type: "number", min: 0.01, message: t("admin.form.billingAmountRequired") }]}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    min={0.01}
                    step={1}
                    precision={2}
                    style={{ width: "100%" }}
                    addonAfter={
                      <Form.Item name="currency" noStyle>
                        <Select
                          options={BILLING_CURRENCIES.map((c) => ({ value: c, label: c }))}
                          style={{ width: 76 }}
                          popupMatchSelectWidth={false}
                        />
                      </Form.Item>
                    }
                  />
                </Form.Item>
              </Col>
              {chargeTypeW === "monthly" ? (
                <Col xs={24} sm={10} md={8}>
                  <Form.Item
                    name="splitAcrossMonths"
                    label={t("admin.payments.splitMonthsLabel")}
                    tooltip={t("admin.payments.splitMonthsHint")}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={2}
                      max={60}
                      precision={0}
                      placeholder={t("admin.payments.splitMonthsPlaceholder")}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>
              ) : null}
            </Row>
          ) : null}

          {/* Billing schedule — monthly only, shown regardless of itemized/single-total */}
          {chargeTypeW === "monthly" ? (
            <div style={sectionStyle}>
              <Typography.Text strong style={{ fontSize: 13, display: "block", marginBottom: 10 }}>
                {t("admin.payments.billingScheduleLabel")}
              </Typography.Text>
              <Form.Item name="billingSchedule" style={{ marginBottom: 10 }}>
                <Radio.Group>
                  <Radio value="monthly">
                    <Flex align="center" gap={4}>
                      <CalendarOutlined />
                      {t("admin.payments.billingScheduleMonthly")}
                    </Flex>
                  </Radio>
                  <Radio value="weekly">
                    <Flex align="center" gap={4}>
                      <CalendarOutlined />
                      {t("admin.payments.billingScheduleWeekly")}
                    </Flex>
                  </Radio>
                  <Radio value="minutely">
                    <Flex align="center" gap={4}>
                      <ClockCircleOutlined />
                      {t("admin.payments.billingScheduleMinutely")}
                    </Flex>
                  </Radio>
                </Radio.Group>
              </Form.Item>

              {/* Monthly → day of month */}
              {(!scheduleW || scheduleW === "monthly") ? (
                <Form.Item
                  name="billingDay"
                  label={t("admin.payments.billingDayLabel")}
                  tooltip={t("admin.payments.billingDayHint")}
                  style={{ marginBottom: 0, maxWidth: 220 }}
                >
                  <Select
                    allowClear
                    placeholder={t("admin.payments.billingDayPlaceholder")}
                    popupMatchSelectWidth={false}
                    options={Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
                  />
                </Form.Item>
              ) : null}

              {/* Weekly → day of week */}
              {scheduleW === "weekly" ? (
                <Form.Item
                  name="billingWeekDay"
                  label={t("admin.payments.billingWeekDayLabel")}
                  style={{ marginBottom: 0, maxWidth: 220 }}
                >
                  <Select
                    allowClear
                    placeholder={t("admin.payments.billingWeekDayPlaceholder")}
                    popupMatchSelectWidth={false}
                    options={WEEK_DAYS.map((d, i) => ({ value: i, label: t(`admin.payments.weekDay.${d}`) }))}
                  />
                </Form.Item>
              ) : null}

              {/* Minutely → interval */}
              {scheduleW === "minutely" ? (
                <Form.Item
                  name="testIntervalMinutes"
                  label={t("admin.payments.testIntervalLabel")}
                  style={{ marginBottom: 0, maxWidth: 220 }}
                >
                  <InputNumber
                    min={1}
                    max={1440}
                    precision={0}
                    addonAfter={t("admin.payments.testIntervalUnit")}
                    placeholder={t("admin.payments.testIntervalPlaceholder")}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              ) : null}
            </div>
          ) : null}

          {/* Itemized line items */}
          {useBreakdownW ? (
            <div style={{ ...sectionStyle, marginBottom: 16 }}>
              <Flex justify="space-between" align="center" wrap="wrap" gap={8} style={{ marginBottom: 12 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t("admin.payments.linesHeading")}
                </Typography.Text>
                <Space wrap size={6}>
                  <Button size="small" onClick={presetBundle} style={{ borderRadius: 6 }}>
                    {t("admin.payments.presetBundle")}
                  </Button>
                  <Button size="small" onClick={presetServerOnly} style={{ borderRadius: 6 }}>
                    {t("admin.payments.presetServerOnly")}
                  </Button>
                </Space>
              </Flex>

              <Form.List name="lineItems">
                {(fields, { add, remove }) => (
                  <>
                    <Flex vertical gap={6} style={{ marginBottom: fields.length > 0 ? 8 : 0 }}>
                      {fields.map(({ key, name, ...rest }) => (
                        <Flex key={key} gap={6} align="flex-start">
                          <Form.Item {...rest} name={[name, "code"]} style={{ width: 72, flexShrink: 0, marginBottom: 0 }}>
                            <Input placeholder="SKU" style={{ color: token.colorTextTertiary }} />
                          </Form.Item>
                          <Form.Item
                            {...rest}
                            name={[name, "label"]}
                            style={{ flex: "1 1 0", minWidth: 0, marginBottom: 0 }}
                            rules={[{ required: true, message: t("admin.payments.labelRequired") }]}
                          >
                            <Input placeholder={t("admin.payments.colLabel")} />
                          </Form.Item>
                          <Form.Item
                            {...rest}
                            name={[name, "amount"]}
                            style={{ width: 130, flexShrink: 0, marginBottom: 0 }}
                            rules={[{ required: true, message: t("admin.payments.amountRequired") }]}
                          >
                            <InputNumber
                              min={0.01}
                              step={1}
                              precision={2}
                              style={{ width: "100%" }}
                              addonAfter={currencyW}
                            />
                          </Form.Item>
                          <Button
                            type="text"
                            danger
                            icon={<MinusCircleOutlined />}
                            aria-label={t("admin.payments.removeLine")}
                            onClick={() => remove(name)}
                            style={{ flexShrink: 0, marginTop: 1 }}
                          />
                        </Flex>
                      ))}
                    </Flex>

                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{ borderRadius: 8 }}>
                      {t("admin.payments.addLine")}
                    </Button>
                  </>
                )}
              </Form.List>

              {(linesRunningTotal ?? 0) > 0 ? (
                <Flex
                  justify="flex-end"
                  style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--ds-border-subtle)" }}
                >
                  <Space direction="vertical" align="end" size={0}>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {t("admin.payments.linesTotal")}
                    </Typography.Text>
                    <Typography.Text strong style={{ fontSize: 20, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                      {formatMoney(linesRunningTotal ?? 0, currencyW)}
                    </Typography.Text>
                  </Space>
                </Flex>
              ) : null}
            </div>
          ) : null}

          {/* Currency (itemized) + Description */}
          <Row gutter={[16, 0]}>
            {useBreakdownW ? (
              <Col xs={24} sm={10} md={8}>
                <Form.Item name="currency" label={t("admin.form.billingCurrency")} style={{ marginBottom: 0 }}>
                  <Select options={BILLING_CURRENCIES.map((c) => ({ value: c, label: c }))} />
                </Form.Item>
              </Col>
            ) : null}
            <Col xs={24} sm={useBreakdownW ? 14 : 24} md={useBreakdownW ? 16 : 24}>
              <Form.Item name="description" label={t("admin.form.billingDescription")} style={{ marginBottom: 0 }}>
                <Input.TextArea
                  placeholder={t("admin.form.billingDescriptionPlaceholder")}
                  showCount
                  maxLength={500}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
              </Form.Item>
            </Col>
          </Row>
    </div>
  );
}
