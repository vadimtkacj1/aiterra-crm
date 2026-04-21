import { TeamOutlined, UserAddOutlined } from "@ant-design/icons";
import { App, Alert, Button, Card, Col, Divider, Form, Input, InputNumber, Modal, Radio, Row, Select, Space, Spin, Table } from "antd";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BillingLineItem } from "../../../../services/AdminService";
import type { MetaCampaignOption } from "../../../../services/interfaces/IMetaCampaignAnalyticsService";
import type { User, UserRole } from "../../../../domain/User";
import type { UserBusinessMeta } from "../../../../services/AdminService";
import { useApp } from "../../../../app/AppProviders";

type LinkMeta = "with" | "without";
type LinkGoogle = "with" | "without";

const BILLING_CURRENCIES = ["USD", "ILS", "EUR", "GBP"] as const;

export function AdminUsersPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const messageRef = useRef(message);
  const tRef = useRef(t);
  messageRef.current = message;
  tRef.current = t;

  const { services, users, usersLoading: loading, createUser, updateUser, resetPassword } = useApp();
  const [form] = Form.useForm<{
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
    linkMeta: LinkMeta;
    metaCampaignId?: string;
    linkGoogle: LinkGoogle;
    googleCustomerId?: string;
    googleDeveloperToken?: string;
    googleRefreshToken?: string;
    googleLoginCustomerId?: string;
  }>();
  const [metaCampaigns, setMetaCampaigns] = useState<MetaCampaignOption[]>([]);
  const [metaCampaignsLoading, setMetaCampaignsLoading] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editMetaLoading, setEditMetaLoading] = useState(false);
  const [editMetaInfo, setEditMetaInfo] = useState<UserBusinessMeta | null>(null);
  const [editGoogleHasCredentials, setEditGoogleHasCredentials] = useState(false);
  const [editForm] = Form.useForm<{
    displayName: string;
    role: UserRole;
    linkMeta: LinkMeta;
    metaCampaignId?: string;
    linkGoogle: LinkGoogle;
    googleCustomerId?: string;
    googleDeveloperToken?: string;
    googleRefreshToken?: string;
    googleLoginCustomerId?: string;
    billingChargeType: "none" | "one_time" | "monthly";
    billingAmount?: number | null;
    billingCurrency?: string;
    billingDescription?: string;
  }>();
  const [pwdForm] = Form.useForm<{ password: string }>();
  const [resetUser, setResetUser] = useState<User | null>(null);
  /** Preserved itemized lines from API; re-sent on save so backend does not wipe them. */
  const preservedBillingLinesRef = useRef<BillingLineItem[] | undefined>(undefined);

  const loadMetaCampaigns = useCallback(async () => {
    setMetaCampaignsLoading(true);
    try {
      const rows = await services.metaAnalytics.listAvailableCampaigns();
      setMetaCampaigns(rows);
    } catch {
      setMetaCampaigns([]);
      messageRef.current.warning(tRef.current("admin.form.metaCampaignsLoadWarning"));
    } finally {
      setMetaCampaignsLoading(false);
    }
  }, [services.metaAnalytics]);

  useEffect(() => {
    void loadMetaCampaigns();
  }, [loadMetaCampaigns]);

  const openEditUser = async (u: User) => {
    preservedBillingLinesRef.current = undefined;
    setEditUser(u);
    setEditMetaInfo(null);
    setEditGoogleHasCredentials(false);
    editForm.setFieldsValue({
      displayName: u.displayName,
      role: u.role,
      linkMeta: "without",
      metaCampaignId: undefined,
      linkGoogle: "without",
      googleCustomerId: undefined,
      googleDeveloperToken: undefined,
      googleRefreshToken: undefined,
      googleLoginCustomerId: undefined,
      billingChargeType: "none",
      billingAmount: undefined,
      billingCurrency: "USD",
      billingDescription: undefined,
    });
    setEditMetaLoading(true);
    try {
      const [info, gInfo] = await Promise.all([
        services.admin.getUserBusinessMeta(String(u.id)),
        services.admin.getUserBusinessGoogle(String(u.id)),
      ]);
      setEditMetaInfo(info);
      setEditGoogleHasCredentials(Boolean(gInfo.hasCredentials));
      editForm.setFieldsValue({
        linkMeta: info.metaCampaignId ? "with" : "without",
        metaCampaignId: info.metaCampaignId ?? undefined,
        linkGoogle: gInfo.customerId ? "with" : "without",
        googleCustomerId: gInfo.customerId ?? undefined,
        googleLoginCustomerId: gInfo.loginCustomerId ?? undefined,
        googleDeveloperToken: undefined,
        googleRefreshToken: undefined,
      });
      if (info.accountId != null) {
        try {
          const bi = await services.admin.getAccountBillingInstruction(info.accountId);
          preservedBillingLinesRef.current =
            bi.lineItems && bi.lineItems.length > 0 ? bi.lineItems.map((x) => ({ ...x })) : undefined;
          editForm.setFieldsValue({
            billingChargeType: bi.chargeType,
            billingAmount: bi.amount ?? undefined,
            billingCurrency: bi.currency || "USD",
            billingDescription: bi.description ?? undefined,
          });
        } catch {
          editForm.setFieldsValue({
            billingChargeType: "none",
            billingAmount: undefined,
            billingCurrency: "USD",
            billingDescription: undefined,
          });
        }
      }
    } catch {
      setEditMetaInfo({ accountId: null, metaCampaignId: null, metaCampaignName: null });
      setEditGoogleHasCredentials(false);
      messageRef.current.error(tRef.current("admin.editMetaLoadError"));
    } finally {
      setEditMetaLoading(false);
    }
  };

  const closeEditUser = () => {
    setEditUser(null);
    setEditMetaInfo(null);
    setEditGoogleHasCredentials(false);
  };

  return (
    <>
      <Row gutter={[24, 24]} align="top">
        <Col xs={24} lg={9}>
          <Card title={<span><UserAddOutlined style={{ marginRight: 8 }} />{t("admin.form.createTitle")}</span>}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{ role: "user", linkMeta: "without", linkGoogle: "without" }}
              onFinish={async (values) => {
                try {
                  const withMeta = values.linkMeta === "with";
                  const selected = withMeta ? metaCampaigns.find((c) => c.id === values.metaCampaignId) : undefined;
                  const withGoogle = values.linkGoogle === "with";
                  await createUser({
                    email: values.email,
                    password: values.password,
                    displayName: values.displayName,
                    role: values.role,
                    ...(withMeta && values.metaCampaignId
                      ? { metaCampaignId: values.metaCampaignId, metaCampaignName: selected?.name }
                      : {}),
                    ...(withGoogle && values.googleCustomerId && values.googleDeveloperToken && values.googleRefreshToken
                      ? {
                          googleCustomerId: values.googleCustomerId,
                          googleDeveloperToken: values.googleDeveloperToken,
                          googleRefreshToken: values.googleRefreshToken,
                          googleLoginCustomerId: values.googleLoginCustomerId,
                        }
                      : {}),
                  });
                  message.success(t("admin.createSuccess"));
                  form.resetFields();
                  form.setFieldsValue({ role: "user", linkMeta: "without", linkGoogle: "without" });
                  await loadMetaCampaigns();
                } catch (e) {
                  message.error(e instanceof Error ? e.message : t("errors.generic"));
                }
              }}
            >
              <Form.Item name="email" label={t("admin.form.email")} rules={[{ required: true, type: "email" }]}>
                <Input />
              </Form.Item>
              <Form.Item
                name="password"
                label={t("admin.form.password")}
                rules={[{ required: true, min: 8, message: t("errors.validation") }]}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item name="displayName" label={t("admin.form.displayName")} rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="role" label={t("admin.form.role")} rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: "user", label: t("admin.roles.user") },
                    { value: "admin", label: t("admin.roles.admin") },
                  ]}
                />
              </Form.Item>
              <Form.Item
                name="linkMeta"
                label={t("admin.form.linkMeta")}
                extra={t("admin.form.linkMetaExtra")}
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
                      extra={t("admin.form.metaCampaignHint")}
                    >
                      <Select
                        showSearch
                        loading={metaCampaignsLoading}
                        filterOption={(input, opt) =>
                          (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                        placeholder={t("admin.form.metaCampaignPlaceholder")}
                        options={metaCampaigns.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
                      />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
              <Form.Item
                name="linkGoogle"
                label={t("admin.form.linkGoogle")}
                extra={t("admin.form.linkGoogleExtra")}
                rules={[{ required: true }]}
              >
                <Radio.Group>
                  <Space direction="vertical" size={10}>
                    <Radio value="without">{t("admin.form.linkGoogleWithout")}</Radio>
                    <Radio value="with">{t("admin.form.linkGoogleWith")}</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>
              <Form.Item noStyle shouldUpdate={(prev, cur) => prev.linkGoogle !== cur.linkGoogle}>
                {({ getFieldValue }) =>
                  getFieldValue("linkGoogle") === "with" ? (
                    <>
                      <Form.Item
                        name="googleCustomerId"
                        label={t("admin.form.googleCustomerId")}
                        rules={[{ required: true, message: t("admin.form.googleCustomerIdRequired") }]}
                        extra={t("admin.form.googleCustomerIdHint")}
                      >
                        <Input placeholder="1234567890" />
                      </Form.Item>
                      <Form.Item
                        name="googleDeveloperToken"
                        label={t("admin.form.googleDeveloperToken")}
                        rules={[{ required: true, message: t("admin.form.googleDeveloperTokenRequired") }]}
                      >
                        <Input.Password />
                      </Form.Item>
                      <Form.Item
                        name="googleRefreshToken"
                        label={t("admin.form.googleRefreshToken")}
                        rules={[{ required: true, message: t("admin.form.googleRefreshTokenRequired") }]}
                      >
                        <Input.Password />
                      </Form.Item>
                      <Form.Item
                        name="googleLoginCustomerId"
                        label={t("admin.form.googleLoginCustomerId")}
                        extra={t("admin.form.googleLoginCustomerIdHint")}
                      >
                        <Input placeholder="1234567890" />
                      </Form.Item>
                    </>
                  ) : null
                }
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<UserAddOutlined />}>
                  {t("admin.form.submit")}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={15}>
          <Card title={<span><TeamOutlined style={{ marginRight: 8 }} />{t("admin.userListTitle")}</span>}>
            <Table
              loading={loading}
              rowKey="id"
              dataSource={users}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              columns={[
                { title: t("admin.table.email"), dataIndex: "email", key: "email", ellipsis: true },
                { title: t("admin.table.displayName"), dataIndex: "displayName", key: "displayName", ellipsis: true },
                {
                  title: t("admin.table.role"),
                  dataIndex: "role",
                  key: "role",
                  width: 100,
                  render: (role: UserRole) => t(`admin.roles.${role}`),
                },
                {
                  title: t("admin.table.actions"),
                  key: "actions",
                  width: 200,
                  render: (_, u: User) => (
                    <Space>
                      <Button size="small" onClick={() => void openEditUser(u)}>
                        {t("admin.editUser")}
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setResetUser(u);
                          pwdForm.resetFields();
                        }}
                      >
                        {t("admin.resetPassword")}
                      </Button>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title={t("admin.editUserTitle")}
        open={editUser != null}
        onCancel={closeEditUser}
        okText={t("admin.save")}
        okButtonProps={{ disabled: editMetaLoading || editMetaInfo === null }}
        onOk={async () => {
          if (!editUser || editMetaLoading || editMetaInfo === null) return;
          try {
            const values = await editForm.validateFields();
            await updateUser(String(editUser.id), {
              displayName: values.displayName,
              role: values.role,
            });
            if (editMetaInfo.accountId != null) {
              const withMeta = values.linkMeta === "with";
              const selected = withMeta ? metaCampaigns.find((c) => c.id === values.metaCampaignId) : undefined;
              await services.admin.setUserBusinessMeta(String(editUser.id), {
                metaCampaignId: withMeta && values.metaCampaignId ? values.metaCampaignId : null,
                metaCampaignName: withMeta && selected ? selected.name : null,
              });
              const withGoogle = values.linkGoogle === "with";
              await services.admin.setUserBusinessGoogle(String(editUser.id), {
                customerId: withGoogle ? (values.googleCustomerId?.trim() || null) : null,
                ...(withGoogle
                  ? {
                      developerToken: values.googleDeveloperToken?.trim() || undefined,
                      refreshToken: values.googleRefreshToken?.trim() || undefined,
                      loginCustomerId: values.googleLoginCustomerId?.trim() || null,
                    }
                  : {}),
              });
              const chargeType = values.billingChargeType ?? "none";
              const amt = values.billingAmount;
              const amount =
                chargeType === "none" ? null : typeof amt === "number" && amt > 0 ? amt : null;
              if (chargeType !== "none" && amount == null) {
                message.error(t("admin.form.billingAmountRequired"));
                return;
              }
              let lineItems: BillingLineItem[] | undefined = preservedBillingLinesRef.current;
              if (lineItems?.length && amount != null) {
                const sum = Math.round(lineItems.reduce((s, x) => s + x.amount, 0) * 100) / 100;
                if (Math.abs(sum - amount) > 0.02) {
                  lineItems = undefined;
                }
              }
              await services.admin.setAccountBillingInstruction(editMetaInfo.accountId, {
                chargeType,
                amount,
                currency: values.billingCurrency ?? "USD",
                description: values.billingDescription?.trim() || null,
                lineItems,
              });
            }
            closeEditUser();
            message.success(t("admin.editSuccess"));
            await loadMetaCampaigns();
          } catch (e) {
            if (e && typeof e === "object" && "errorFields" in e) return;
            let msg = e instanceof Error ? e.message : t("errors.generic");
            if (axios.isAxiosError(e)) {
              const raw = e.response?.data as { detail?: unknown } | undefined;
              const d = typeof raw?.detail === "string" ? raw.detail : "";
              if (d) msg = d;
            }
            if (msg === "google_tokens_required") {
              message.error(t("admin.form.googleTokensRequired"));
              return;
            }
            message.error(msg);
          }
        }}
      >
        <Spin spinning={editMetaLoading}>
          <Form form={editForm} layout="vertical" style={{ marginTop: 8 }}>
            <Form.Item name="displayName" label={t("admin.form.displayName")} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="role" label={t("admin.form.role")} rules={[{ required: true }]}>
              <Select
                options={[
                  { value: "user", label: t("admin.roles.user") },
                  { value: "admin", label: t("admin.roles.admin") },
                ]}
              />
            </Form.Item>
            {editMetaInfo && editMetaInfo.accountId == null ? (
              <Alert type="info" showIcon message={t("admin.editNoBusiness")} style={{ marginBottom: 12 }} />
            ) : null}
            {editMetaInfo && editMetaInfo.accountId != null ? (
              <>
                <Form.Item
                  name="linkMeta"
                  label={t("admin.form.linkMeta")}
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
                      >
                        <Select
                          showSearch
                          loading={metaCampaignsLoading}
                          filterOption={(input, opt) =>
                            (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())
                          }
                          placeholder={t("admin.form.metaCampaignPlaceholder")}
                          options={metaCampaigns.map((c) => ({ value: c.id, label: `${c.name} (${c.id})` }))}
                        />
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>

                <Form.Item name="linkGoogle" label={t("admin.form.linkGoogle")} rules={[{ required: true }]}>
                  <Radio.Group>
                    <Space direction="vertical" size={10}>
                      <Radio value="without">{t("admin.form.linkGoogleWithout")}</Radio>
                      <Radio value="with">{t("admin.form.linkGoogleWith")}</Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prev, cur) => prev.linkGoogle !== cur.linkGoogle}>
                  {() =>
                    editForm.getFieldValue("linkGoogle") === "with" ? (
                      <>
                        <Form.Item
                          name="googleCustomerId"
                          label={t("admin.form.googleCustomerId")}
                          rules={[{ required: true, message: t("admin.form.googleCustomerIdRequired") }]}
                        >
                          <Input placeholder="1234567890" />
                        </Form.Item>
                        <Form.Item
                          name="googleDeveloperToken"
                          label={t("admin.form.googleDeveloperToken")}
                          rules={
                            editGoogleHasCredentials
                              ? []
                              : [{ required: true, message: t("admin.form.googleDeveloperTokenRequired") }]
                          }
                          extra={editGoogleHasCredentials ? t("admin.form.googleTokensKeepHint") : undefined}
                        >
                          <Input.Password />
                        </Form.Item>
                        <Form.Item
                          name="googleRefreshToken"
                          label={t("admin.form.googleRefreshToken")}
                          rules={
                            editGoogleHasCredentials
                              ? []
                              : [{ required: true, message: t("admin.form.googleRefreshTokenRequired") }]
                          }
                        >
                          <Input.Password />
                        </Form.Item>
                        <Form.Item name="googleLoginCustomerId" label={t("admin.form.googleLoginCustomerId")}>
                          <Input placeholder="1234567890" />
                        </Form.Item>
                      </>
                    ) : null
                  }
                </Form.Item>

                <Divider plain style={{ margin: "16px 0" }}>
                  {t("admin.form.billingInstructionSection")}
                </Divider>
                <Form.Item
                  name="billingChargeType"
                  label={t("admin.form.billingChargeType")}
                  rules={[{ required: true }]}
                >
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
            ) : null}
          </Form>
        </Spin>
      </Modal>

      <Modal
        title={t("admin.resetPasswordTitle")}
        open={resetUser != null}
        onCancel={() => setResetUser(null)}
        okText={t("admin.resetPasswordSubmit")}
        onOk={async () => {
          if (!resetUser) return;
          try {
            const values = await pwdForm.validateFields();
            await resetPassword(String(resetUser.id), values.password);
            setResetUser(null);
            message.success(t("admin.passwordUpdated"));
          } catch (e) {
            if (e && typeof e === "object" && "errorFields" in e) return;
            message.error(e instanceof Error ? e.message : t("errors.generic"));
          }
        }}
      >
        <Form form={pwdForm} layout="vertical">
          <Form.Item name="password" label={t("admin.newPassword")} rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
