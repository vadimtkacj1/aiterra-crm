import { Form, Radio, Select, Space } from "antd";
import type { TFunction } from "i18next";
import type { MetaCampaignOption } from "@/services/analytics/meta/IMetaCampaignAnalyticsService";

type Props = {
  t: TFunction;
  metaCampaigns: MetaCampaignOption[];
  metaCampaignsLoading: boolean;
  showLinkMetaExtra?: boolean;
};

export function AdminUsersMetaLinkFields({ t, metaCampaigns, metaCampaignsLoading, showLinkMetaExtra }: Props) {
  return (
    <>
      <Form.Item
        name="linkMeta"
        label={t("admin.form.linkMeta")}
        extra={showLinkMetaExtra ? t("admin.form.linkMetaExtra") : undefined}
        rules={[{ required: true }]}
      >
        <Radio.Group>
          <Space direction="vertical" size={10}>
            <Radio value="without">{t("admin.form.linkMetaWithout")}</Radio>
            <Radio value="with">{t("admin.form.linkMetaWith")}</Radio>
          </Space>
        </Radio.Group>
      </Form.Item>
      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.linkMeta !== cur.linkMeta}>
        {({ getFieldValue }) =>
          getFieldValue("linkMeta") === "with" ? (
            <Form.Item
              name="metaCampaignId"
              label={t("admin.form.metaCampaign")}
              rules={[{ required: true, message: t("admin.form.metaCampaignRequired") }]}
              extra={showLinkMetaExtra ? t("admin.form.metaCampaignHint") : undefined}
            >
              <Select
                showSearch
                loading={metaCampaignsLoading}
                filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                placeholder={t("admin.form.metaCampaignPlaceholder")}
                options={metaCampaigns.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
              />
            </Form.Item>
          ) : null
        }
      </Form.Item>
    </>
  );
}
