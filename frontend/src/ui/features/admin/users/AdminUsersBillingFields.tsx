import { Divider, Form, Input, InputNumber, Radio, Select, Space } from "antd";
import type { TFunction } from "i18next";
import { BILLING_CURRENCIES } from "@/ui/features/admin/payments/types";

type Props = { t: TFunction };

export function AdminUsersBillingFields({ t }: Props) {
  return (
    <>
      <Divider plain style={{ margin: "16px 0" }}>
        {t("admin.form.billingInstructionSection")}
      </Divider>
      <Form.Item name="billingChargeType" label={t("admin.form.billingChargeType")} rules={[{ required: true }]}>
        <Radio.Group>
          <Space direction="vertical" size={10}>
            <Radio value="none">{t("admin.form.billingTypeNone")}</Radio>
            <Radio value="one_time">{t("admin.form.billingTypeOneTime")}</Radio>
            <Radio value="monthly">{t("admin.form.billingTypeMonthly")}</Radio>
          </Space>
        </Radio.Group>
      </Form.Item>
      <Form.Item noStyle shouldUpdate={(p, c) => p.billingChargeType !== c.billingChargeType}>
        {({ getFieldValue }) =>
          getFieldValue("billingChargeType") !== "none" ? (
            <>
              <Form.Item
                name="billingAmount"
                label={t("admin.form.billingAmount")}
                rules={[
                  {
                    required: true,
                    type: "number",
                    min: 0.01,
                    message: t("admin.form.billingAmountRequired"),
                  },
                ]}
              >
                <InputNumber
                  min={0.01}
                  step={1}
                  precision={2}
                  style={{ width: "100%" }}
                  placeholder={t("admin.form.billingAmountPlaceholder")}
                />
              </Form.Item>
              <Form.Item name="billingCurrency" label={t("admin.form.billingCurrency")}>
                <Select options={BILLING_CURRENCIES.map((c) => ({ value: c, label: c }))} />
              </Form.Item>
              <Form.Item name="billingDescription" label={t("admin.form.billingDescription")}>
                <Input placeholder={t("admin.form.billingDescriptionPlaceholder")} />
              </Form.Item>
            </>
          ) : null
        }
      </Form.Item>
    </>
  );
}
