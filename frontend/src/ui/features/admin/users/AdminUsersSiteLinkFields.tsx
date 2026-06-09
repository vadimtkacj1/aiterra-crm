import { Form, Input, Radio, Switch } from "antd";
import { LinkOutlined, MailOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import type { TFunction } from "i18next";
import type { UserBusinessSite } from "@/services/admin/AdminService";
import { Env } from "@/config/Env";
import { SiteIntegrationCard } from "@/ui/features/user/site/components/SiteIntegrationCard";

type Props = {
  t: TFunction;
  siteInfo?: UserBusinessSite | null;
  onTokenRegenerated?: (newToken: string) => void;
  regenerateToken?: (accountId: string) => Promise<{ publicToken: string | null }>;
  sendTestNotification?: (accountId: string, email: string) => Promise<void>;
};

export function AdminUsersSiteLinkFields({ t, siteInfo, onTokenRegenerated, regenerateToken, sendTestNotification }: Props) {
  const apiBaseUrl = useMemo(() => new Env().apiBaseUrl, []);

  return (
    <>
      <Form.Item
        name="linkSite"
        label={t("admin.form.linkSite")}
        valuePropName="checked"
      >
        <Switch
          checkedChildren={t("admin.form.linkSiteWith")}
          unCheckedChildren={t("admin.form.linkSiteWithout")}
        />
      </Form.Item>

      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.linkSite !== cur.linkSite}>
        {({ getFieldValue }) =>
          getFieldValue("linkSite") ? (
            <>
              <Form.Item
                name="siteUrl"
                label={t("admin.form.siteUrl")}
                rules={[{
                  validator: async (_, value) => {
                    if (!value || !value.trim()) return;
                    try { new URL(value); } catch { throw new Error(t("admin.form.siteUrlInvalid")); }
                  }
                }]}
              >
                <Input prefix={<LinkOutlined />} placeholder="https://example.com" />
              </Form.Item>

              {/* Notification channel */}
              <Form.Item
                name="notifyChannel"
                label={t("site.notify.channelLabel")}
                initialValue="whatsapp"
              >
                <Radio.Group>
                  <Radio value="whatsapp">
                    <WhatsAppOutlined style={{ color: "#25d366", marginRight: 4 }} />
                    WhatsApp
                  </Radio>
                  <Radio value="email">
                    <MailOutlined style={{ marginRight: 4 }} />
                    {t("site.notify.channelEmail")}
                  </Radio>
                  <Radio value="both">{t("site.notify.channelBoth")}</Radio>
                  <Radio value="none">{t("site.notify.channelNone")}</Radio>
                </Radio.Group>
              </Form.Item>

              {/* WhatsApp config fields */}
              <Form.Item
                noStyle
                shouldUpdate={(prev, cur) => prev.notifyChannel !== cur.notifyChannel}
              >
                {({ getFieldValue: gfv }) => {
                  const ch = gfv("notifyChannel") as string;
                  if (ch !== "whatsapp" && ch !== "both") return null;
                  return (
                    <>
                      <Form.Item name="waOwnerPhone" label={t("site.whatsapp.ownerPhone")}>
                        <Input
                          prefix={<WhatsAppOutlined style={{ color: "#25d366" }} />}
                          placeholder={t("site.whatsapp.ownerPhonePlaceholder")}
                        />
                      </Form.Item>
                      <Form.Item name="waNotifyMessage" label={t("site.whatsapp.message")}>
                        <Input.TextArea
                          placeholder={t("site.whatsapp.messagePlaceholder")}
                          rows={2}
                        />
                      </Form.Item>
                    </>
                  );
                }}
              </Form.Item>

              {/* Email config fields */}
              <Form.Item
                noStyle
                shouldUpdate={(prev, cur) => prev.notifyChannel !== cur.notifyChannel}
              >
                {({ getFieldValue: gfv }) => {
                  const ch = gfv("notifyChannel") as string;
                  if (ch !== "email" && ch !== "both") return null;
                  return (
                    <>
                      <Form.Item name="emailNotifySubject" label={t("site.email.subject")}>
                        <Input placeholder={t("site.email.subjectPlaceholder")} />
                      </Form.Item>
                      <Form.Item name="emailNotifyMessage" label={t("site.email.message")}>
                        <Input.TextArea
                          placeholder={t("site.email.messagePlaceholder")}
                          rows={2}
                        />
                      </Form.Item>
                    </>
                  );
                }}
              </Form.Item>

              {siteInfo?.publicToken && siteInfo.accountId != null && regenerateToken && onTokenRegenerated && (
                <Form.Item label={t("site.integration.title")} style={{ marginBottom: 0 }}>
                  <SiteIntegrationCard
                    accountId={String(siteInfo.accountId)}
                    publicToken={siteInfo.publicToken}
                    apiBaseUrl={apiBaseUrl}
                    onTokenRegenerated={onTokenRegenerated}
                    regenerateToken={regenerateToken}
                    sendTestNotification={sendTestNotification}
                  />
                </Form.Item>
              )}
            </>
          ) : null
        }
      </Form.Item>
    </>
  );
}
