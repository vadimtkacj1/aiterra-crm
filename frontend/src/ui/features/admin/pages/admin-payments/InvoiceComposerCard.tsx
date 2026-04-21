import {
  CalendarOutlined,
  FileAddOutlined,
  FileTextOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  StopOutlined,
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
import type { GlobalToken } from "antd/es/theme/interface";
import type { TFunction } from "i18next";
import { SectionStep, formatMoney } from "./billingUi";
import { BILLING_CURRENCIES } from "./types";

type Props = {
  t: TFunction;
  token: GlobalToken;
  shellRadius: number;
  shellShadow: string;
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
      value: "none",
      icon: <StopOutlined style={{ fontSize: 18 }} />,
      label: t("admin.payments.chargeNoneShort"),
      desc: t("admin.payments.chargeNoneDesc"),
    },
    {
      value: "one_time",
      icon: <FileTextOutlined style={{ fontSize: 18 }} />,
      label: t("admin.payments.chargeOneShort"),
      desc: t("admin.payments.chargeOneDesc"),
    },
    {
      value: "monthly",
      icon: <CalendarOutlined style={{ fontSize: 18 }} />,
      label: t("admin.payments.chargeMonthlyShort"),
      desc: t("admin.payments.chargeMonthlyDesc"),
    },
  ];

  return (
    <Flex gap={8} wrap="wrap">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <div
            key={opt.value}
            role="button"
            tabIndex={0}
            onClick={() => onChange?.(opt.value)}
            onKeyDown={(e) => e.key === "Enter" && onChange?.(opt.value)}
            style={{
              flex: "1 1 120px",
              padding: "14px 14px 12px",
              borderRadius: 10,
              border: `1.5px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
              background: selected ? token.colorPrimaryBg : token.colorBgContainer,
              cursor: "pointer",
              transition: "border-color 0.15s, background 0.15s",
              userSelect: "none",
            }}
          >
            <div
              style={{
                color: selected ? token.colorPrimary : token.colorTextTertiary,
                marginBottom: 8,
                lineHeight: 1,
              }}
            >
              {opt.icon}
            </div>
            <Typography.Text
              strong
              style={{
                display: "block",
                fontSize: 13,
                marginBottom: 3,
                color: selected ? token.colorText : token.colorTextSecondary,
              }}
            >
              {opt.label}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11, lineHeight: 1.45 }}>
              {opt.desc}
            </Typography.Text>
          </div>
        );
      })}
    </Flex>
  );
}

export function InvoiceComposerCard({
  t,
  token,
  shellRadius,
  shellShadow,
  chargeTypeW,
  useBreakdownW,
  currencyW,
  linesRunningTotal,
  canSaveTemplate,
  openSaveTemplateModal,
  presetBundle,
  presetServerOnly,
}: Props) {
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
            step={t("admin.payments.stepLabel2")}
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
      <Form.Item name="chargeType" style={{ marginBottom: 0 }}>
        <ChargeTypePicker token={token} t={t} />
      </Form.Item>

      {chargeTypeW !== "none" ? (
        <>
          <Divider style={{ margin: "20px 0 16px" }} />

          {/* Pricing mode toggle */}
          <Flex align="center" justify="space-between" wrap="wrap" gap={8} style={{ marginBottom: 16 }}>
            <Typography.Text strong style={{ fontSize: 13 }}>
              {t("admin.payments.sectionAmounts")}
            </Typography.Text>
            <Form.Item name="useBreakdown" noStyle>
              <Radio.Group size="small" optionType="button">
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
                  label={t("admin.form.billingAmount")}
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
            </Row>
          ) : null}

          {/* Itemized line items */}
          {useBreakdownW ? (
            <div
              style={{
                background: token.colorFillAlter,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 10,
                padding: "14px 14px 12px",
                marginBottom: 16,
              }}
            >
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
                  style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${token.colorSplit}` }}
                >
                  <Space direction="vertical" align="end" size={0}>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {t("admin.payments.linesTotal")}
                    </Typography.Text>
                    <Typography.Text strong style={{ fontSize: 20, letterSpacing: "-0.02em" }}>
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
        </>
      ) : null}
    </div>
  );
}
