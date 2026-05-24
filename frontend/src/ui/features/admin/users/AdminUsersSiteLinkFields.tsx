import { Form, Input, Switch } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import type { TFunction } from "i18next";

type Props = {
  t: TFunction;
};

export function AdminUsersSiteLinkFields({ t }: Props) {
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
            <Form.Item
              name="siteUrl"
              label={t("admin.form.siteUrl")}
              rules={[{ type: "url", message: t("admin.form.siteUrlInvalid") }]}
            >
              <Input prefix={<LinkOutlined />} placeholder="https://example.com" />
            </Form.Item>
          ) : null
        }
      </Form.Item>
    </>
  );
}
