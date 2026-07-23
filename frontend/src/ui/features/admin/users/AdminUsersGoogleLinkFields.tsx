import { Form, Input, Switch } from "antd";
import type { TFunction } from "i18next";

type Props = {
  t: TFunction;
  mode: "create" | "edit";
  /** When true (edit + existing Google creds), dev/refresh tokens are optional. */
  editGoogleHasCredentials?: boolean;
};

export function AdminUsersGoogleLinkFields({ t, mode, editGoogleHasCredentials }: Props) {
  const showExtra = mode === "create";
  const tokensOptional = mode === "edit" && Boolean(editGoogleHasCredentials);

  return (
    <>
      {/* Toggle row — same pattern as the Site module switch. Stored value
          stays "with"/"without" so payloads and edit prefill are unchanged. */}
      <Form.Item
        name="linkGoogle"
        label={t("admin.form.linkGoogle")}
        extra={showExtra ? t("admin.form.linkGoogleExtra") : undefined}
        getValueProps={(value) => ({ checked: value === "with" })}
        normalize={(checked) => (checked === true || checked === "with" ? "with" : "without")}
      >
        <Switch
          checkedChildren={t("admin.form.linkGoogleWith")}
          unCheckedChildren={t("admin.form.linkGoogleWithout")}
        />
      </Form.Item>
      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.linkGoogle !== cur.linkGoogle}>
        {({ getFieldValue }) =>
          getFieldValue("linkGoogle") === "with" ? (
            <>
              <Form.Item
                name="googleCustomerId"
                label={t("admin.form.googleCustomerId")}
                rules={[{ required: true, message: t("admin.form.googleCustomerIdRequired") }]}
                extra={showExtra ? t("admin.form.googleCustomerIdHint") : undefined}
              >
                <Input placeholder="1234567890" />
              </Form.Item>
              <Form.Item
                name="googleDeveloperToken"
                label={t("admin.form.googleDeveloperToken")}
                rules={
                  tokensOptional ? [] : [{ required: true, message: t("admin.form.googleDeveloperTokenRequired") }]
                }
                extra={tokensOptional ? t("admin.form.googleTokensKeepHint") : undefined}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item
                name="googleRefreshToken"
                label={t("admin.form.googleRefreshToken")}
                rules={
                  tokensOptional ? [] : [{ required: true, message: t("admin.form.googleRefreshTokenRequired") }]
                }
              >
                <Input.Password />
              </Form.Item>
              <Form.Item
                name="googleLoginCustomerId"
                label={t("admin.form.googleLoginCustomerId")}
                extra={showExtra ? t("admin.form.googleLoginCustomerIdHint") : undefined}
              >
                <Input placeholder="1234567890" />
              </Form.Item>
            </>
          ) : null
        }
      </Form.Item>
    </>
  );
}
