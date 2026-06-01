import { Form, Input, Switch } from "antd";
import { LinkOutlined } from "@ant-design/icons";
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
};

export function AdminUsersSiteLinkFields({ t, siteInfo, onTokenRegenerated, regenerateToken }: Props) {
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

              {siteInfo?.publicToken && siteInfo.accountId != null && regenerateToken && onTokenRegenerated && (
                <Form.Item label={t("site.integration.title")} style={{ marginBottom: 0 }}>
                  <SiteIntegrationCard
                    accountId={String(siteInfo.accountId)}
                    publicToken={siteInfo.publicToken}
                    apiBaseUrl={apiBaseUrl}
                    onTokenRegenerated={onTokenRegenerated}
                    regenerateToken={regenerateToken}
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
