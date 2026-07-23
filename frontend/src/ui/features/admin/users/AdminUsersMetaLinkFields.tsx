import { FacebookOutlined } from "@ant-design/icons";
import { Form, Select, Switch } from "antd";
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
      {/* Toggle row — same pattern as the Site module switch. The stored form
          value stays the legacy "with"/"without" string so submit payloads and
          the edit-modal prefill are unchanged. */}
      <Form.Item
        name="linkMeta"
        label={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <FacebookOutlined style={{ color: "#1877f2" }} />
            {t("admin.form.linkMeta")}
          </span>
        }
        extra={showLinkMetaExtra ? t("admin.form.linkMetaExtra") : undefined}
        getValueProps={(value) => ({ checked: value === "with" })}
        normalize={(checked) => (checked === true || checked === "with" ? "with" : "without")}
      >
        <Switch
          checkedChildren={t("admin.form.linkMetaWith")}
          unCheckedChildren={t("admin.form.linkMetaWithout")}
        />
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
